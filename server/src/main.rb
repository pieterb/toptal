# encoding: UTF-8

require_relative 'logger.rb'
require 'rackful'
require 'json'


$LOGGER = Todo::Logger.new(
  #:logdev => 'todo.log',
  :logdev => STDERR
  #:shift_age => 'daily'
)

$USER_DATA = File.exist?('user_data.json') ?
  JSON.parse(IO.binread('user_data.json', :symbolize_names => true)) : {}
at_exit do
  IO.binwrite('user_data.json', JSON.generate($USER_DATA))
end

$LOGIN = Object.new
class < $LOGIN
  include Rackful::Resource
  
end
$LOGIN.uri = '/login'
