# encoding: UTF-8

require_relative 'logger.rb'
require 'rackful'
require 'multi_json'


$LOGGER = Planner::Logger.new(
#:logdev => 'todo.log',
:logdev => STDERR
#:shift_age => 'daily'
)

$USER_DATA = File.exist?('user_data.json') ?
MultiJson.load(IO.binread('user_data.json')) : {}
$USER_DATA['passwords'] ||= {}
$USER_DATA['plans'] ||= {}
at_exit do
  IO.binwrite('user_data.json', MultiJson.dump($USER_DATA, :pretty => true))
end


module Planner

  # @return [String]
  def self.uid
    $USER_DATA['uid'] ||= 0
    $USER_DATA['uid'] += 1
    $USER_DATA['uid'].to_s
  end


  class Planner::Authenticate

    def initialize app
      @app = app
    end


    def call(env)
      request = Rackful::Request.new(env)
      uri = request.canonical_uri
      if %r{^/+api/+plans(?:/+([^/]*))?} === uri.path
        segments = uri.segments
        if segments.size > 2 && ! segments[2].empty? && segments[2] != request.session['email']
          return Rackful::StatusCodes::HTTP403Forbidden.new.to_response(request)
        end
      end
      @app.call(env)
    end
  end


  class Planner::Serializer < Rackful::Serializer

    produces 'application/hal+json'

    @@yaks = Yaks.new do |yaks|
      format_options :hal, plural_links: [:curies]
      namespace Planner
    end


    def each
      yield MultiJson.dump(@@yaks.serialize(resource, format: :hal, env: request), :pretty => true)
    end


  end # class HALJSON < Serializer


  class Resource
    include Rackful::Resource
    include Rackful::Serializable
    add_serializer Planner::Serializer

    def initialize
      self.uri = self.class.const_get :RESOURCE_URI
    end
    SUPPORTED_MEDIA_TYPES = %w{application/json application/hal+json}


    def body request
      return @planner_request_body if @planner_request_body
      unless SUPPORTED_MEDIA_TYPES.include? request.media_type
        raise HTTP415UnsupportedMediaType.new(SUPPORTED_MEDIA_TYPES)
      end
      begin
        @planner_request_body = MultiJson.load( request.body.read )
      rescue
        raise HTTP400BadRequest, $!.message
      end
    end
  end


  class ResourceMapper < Yaks::Mapper
    link :curies, '/profiles.html#{rel}', :name => 'planner', :expand => false

    def map_links(resource)
      collection_uri = object.uri.to_s.sub(%r{/[^/]+/?$}, '')
      collection_uri = '/' if collection_uri == ''
      super(resource).
      add_link( Yaks::Resource::Link.new(:collection, collection_uri,  {}) ).
      add_link( Yaks::Resource::Link.new(:self,       object.uri.to_s, {}) )
    end
  end


  class Main < Resource
    RESOURCE_URI = '/api'
  end
  MAIN = Main.new


  class MainMapper < ResourceMapper
    link 'planner:plans', '/api/plans'
    link 'planner:login', '/api/login?email={email}&password={password}', :expand => false
    link 'planner:signon', '/api/signon'
  end


  class Signon < Resource
    RESOURCE_URI = '/api/signon'

    def do_POST request, response
      body = self.body request
      if %w{email password}.any? { |name| body[name].nil? or ! body[name].kind_of?(String) }
        raise HTTP422UnprocessableEntity, 'Email or password missing, or not a string'
      end
      response.status = 200
      if request.session['email']
        if request.session['email'] == body['email']
          # Do only the obvious, below.
        elsif $USER_DATA['passwords'][body['email']].nil?
          $USER_DATA['plans'][body['email']] = $USER_DATA['plans'][request.session['email']]
          $USER_DATA['plans'].delete request.session['email']
        else
          raise HTTP422UnprocessableEntity, 'email address already in use'
        end
      elsif $USER_DATA['passwords'][body['email']].nil?
        response.status = 201
        response['Location'] = request.base_url + RESOURCE_URI
      else
        raise HTTP403Forbidden, 'Email address already in use. Login first.'
      end
      $USER_DATA['passwords'][body['email']] = body['password']
      $USER_DATA['plans'][body['email']] ||= []
      request.session['email'] ||= body['email']
      do_GET request, response
      response.headers.merge! self.default_headers
    end
  end


  class SignonMapper < ResourceMapper
    attributes :email

    def email
      env.session['email']
    end
  end
  SIGNON = Signon.new


  class Login < Resource
    RESOURCE_URI = '/api/login'

    def do_GET request, response
      request.session.delete 'email'
      return super(request, response) if request.params.empty?
      %w{ email password }.each do |name|
        if request[name].nil?
          raise HTTP400BadRequest, "Missing required query parameter '#{name}'"
        end
      end
      if $USER_DATA['passwords'][request['email']] != request['password']
        raise HTTP403Forbidden, 'Incorrect password.'
      end
      request.session['email'] = request['email']
      super(request, response)
    end
  end

  LOGIN = Login.new


  class LoginMapper < ResourceMapper

    def map_links(resource)
      super(resource).
      add_link( Yaks::Resource::Link.new(:self, '/api/login?email={email}&password={password}', :templated => true) )
    end

  end


  class Plans < Resource
    RESOURCE_URI = '/api/plans'
  end
  PLANS = Plans.new


  class PlansMapper < ResourceMapper

    def map_links(resource)
      resource = super(resource)
      if env.session['email']
        resource = resource.add_link( Yaks::Resource::Link.new( :'planner:userplans', object.uri.to_s + '/' + Rack::Utils.escape_path( env.session['email'] ), {} ) )
      end
      resource
    end

  end


  class UserPlans < Resource

    def initialize path
      self.uri = path
      $USER_DATA['plans'][email] ||= {}
    end


    def ud
      @ud ||= $USER_DATA['plans'][email]
    end


    # @return [String]
    def email
      uri.segments[2]
    end


    def each

      ud.keys.each do
        |uid|
        yield UserPlansMapper.new( base + uid )
      end
    end


    def plans
      ud.keys.map do
        |uid|
        UserPlansMapper.new( base + uid )
      end
    end


    def do_POST request, response
      body = self.body request
      uid = Planner.uid
      plan_path = self.uri.path + '/' + Planner.uid
      plan = Plan.new( plan_path )
      plan.update body
      raise HTTP201Created, plan_path
    end
  end


  class UserPlansMapper < ResourceMapper
    has_many :plans, :rel => 'planner:plan'
  end


  class Plan < Resource

    def parse_time t
      begin
        return Time.xmlschema(t)
      rescue ArgumentError
        nil
      end
    end


    # @return [String]
    def uid
      uri.segments[3]
    end


    # @return [String]
    def email
      uri.segments[2]
    end


    def initialize path
      self.uri = path
      $USER_DATA['plans'][email] ||= {}
    end


    def ud
      @ud ||= $USER_DATA['plans'][email][uid]
    end


    def empty?
      ud.nil?
    end


    def update body
      $USER_DATA['plans'][email][uid] ||= {}
      unless %w{start end city}.all? { |name| body[name].kind_of?(String) and ! body[name].empty? }
        raise HTTP422UnprocessableEntity
      end
      unless %w{start end}.all? { |name| /^\d{4}-\d{2}-\d{2}$/ === body[name] }
        raise HTTP422UnprocessableEntity, "Couldn’t parse %{name}." unless memo[name] = parse_time( body[name] )
      end
      digestee = ''
      %w{start end city}.each do
        |name|
        ud[name] = body[name]
        digestee += body[name]
      end
      ud['etag'] = Digest::SHA384.base64digest(digestee)
      ud['last_modified'] = Time.now.to_i
    end


    def do_PUT request, response
      raise HTTP403Forbidden if empty?
      update self.body(request)
    end


    def do_DELETE request, response
      $USER_DATA['plans'][email].delete uid
    end
  end


  class PlanMapper < ResourceMapper
    attributes :start, :end, :city

    def load_attribute(name)
      object.ud[name.to_s]
    end
  end

end
