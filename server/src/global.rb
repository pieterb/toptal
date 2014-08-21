# encoding: utf-8

module Kernel
  unless respond_to? :__dir__
    # Backport of method `__dir__` that was introduced in Ruby 2.x.
    # @return [String]
    def __dir__
      File.dirname(File.realpath(caller[0][%r{^[^:]+}]))
    end
  end
end

module Todo
end
