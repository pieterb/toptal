# encoding: utf-8

require_relative 'src/main.rb'

#lambda do
#  [ 'rackful', 'yuks' ].each do
#    |library|
#    path = File.expand_path( File.join( '..', library ), __dir__ )
#    $:.unshift path unless $:.include?( path )
#  end
#end.call

# I believe `rack.logger` is the 'official' name for a user-provided logger to Rack, but I'm not sure where I got that from. --PvB
use Rack::Config do
  |env|
  env['rack.logger'] = $LOGGER
end


# The default configuration uses Rack::Chunked to allow streaming of response
# bodies. Using this middleware, we don't have to specify a +Content-Length+
# header.
# However, it seems Sinatra has its own way of handling streaming content...
require 'rack/chunked'
use Rack::Chunked


# This middleware is only used during development, and should be disabled in
# production services. It checks if the source code has changed since the last
# request, and reloads the new source code when needed.
#
# This works _most_ of the time, but can lead to unexpected results too...
# If you're debugging the service, make sure you don't accidentally chase
# phantom bugs introduced by dynamically reloading source files!
require 'rack/reloader'
use Rack::Reloader # , 1 # Optional cooldown period in seconds, default 10


$CLIENT_PATH = File.expand_path( File.join( '..', 'client' ), __dir__ )
$LOGGER.info $CLIENT_PATH

use Rack::Static, :urls => [ %r{^/$}, '/css', '/js' ], :root => $CLIENT_PATH, :index => 'index.html'

use Rack::Session::Pool
use Rack::Config do
  |env|
  env['rack.session'][:foo] = 'bar'
end

run Rackful::Server.new {
  |uri|
  case uri.path
  when '/hello'
    Todo::THING
  end
}

#use Rack::Static, :urls => ["/js", "/css"], :root => $CLIENT_PATH

#map '/index.html' do
#  run lambda {
#    |env|
#    [
#      200,
#      { 'Content-Type' => 'text/html; charset="UTF-8"' },
#      [ IO.binread( File.join( $CLIENT_PATH, 'index.html' ) ) ]
#    ]
#  }
#end
