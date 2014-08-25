# encoding: utf-8

require_relative 'global.rb'

require 'logger'
require 'thread'
require 'pp'

module Planner

class Logger < ::Logger

  # @option opts [String, IO] :logdev ('lucipher.log') The log device. This is a
  #   filename (String) or IO object (typically `STDOUT`, `STDERR`, or an open
  #   file).
  # @option opts [Integer, String] :shift_age (0) Number of old log files to
  #   keep, or frequency of rotation (`'daily'`, `'weekly'` or `'monthly'`). `0`
  #   means keeping an infinite number of log files.
  # @option opts [Integer] :shift_size (1048576) Maximum logfile size (only 
  #   applies when `shift_age` is a number).
  # @option opts [Integer] :level See {http://ruby-doc.org/stdlib-1.9.3/libdoc/logger/rdoc/Logger/Severity.html ::Logger::Severity}. Defaults:
  #     *   **::Logger::DEBUG** if `$DEBUG` is true, else
  #     *   **::Logger::INFO** if `$VERBOSE` is true, else
  #     *   **::Logger::WARN** if `$-w` is true, else
  #     *   **::Logger::ERROR**
  # @see http://ruby-doc.org/stdlib/libdoc/logger/rdoc/Logger.html#method-c-new ::Logger::new
  def initialize opts = {}
    superargs = [ opts[:logdev] || STDERR ]
    if opts.key? :shift_age
      superargs << opts[ :shift_age ]
      superargs << opts[ :shift_size ] if opts.key? :shift_size
    end
    super(*superargs)
    self.level = if opts.key?( :level )
      opts[:level]
    elsif $DEBUG
      ::Logger::DEBUG
    elsif $VERBOSE
      ::Logger::INFO
    elsif $-w
      ::Logger::WARN
    else
      ::Logger::ERROR
    end
    f = Logger::Formatter.new
    root = File.expand_path( File.join('..'), __dir__ )
    #STDERR.puts root
    self.formatter = lambda do
      |severity, datetime, progname, msg|
      from = caller[4]
      from.sub!( root, '' )
      progname = $1 if progname.nil? and from =~ %r{\A/(\w+)}
      unless Thread.main.equal?( Thread.current )
        thread_id = Thread.current[:logger_thread_id] || Thread.current.object_id
        progname = "%s (%s)" % [ progname, thread_id ]
      end
      msg = from + ': ' + msg.pretty_inspect
      f.call( severity, datetime, progname, msg )
    end
  end

  # Sets the *id* of the current Thread.
  # By default, this Logger logs the `object_id` of the current thread for each message (unless the message is sent from the main thread). This `object_id` is not very descriptive. To make your logs more informative, you can specify a more meaningful id to each Thread you create.
  # @example
  #   $LOGGER = Planner::Logger.new
  #   a = Thread.new {
  #     $LOGGER.thread_id = 'gui'
  #     # ... run gui stuff here ...
  #   }
  # @param id [#to_s]
  # @return [#to_s] `id`
  def thread_id=( id )
    Thread.current[:logger_thread_id] = id
  end

end # class Planner::Logger
end # module Planner
