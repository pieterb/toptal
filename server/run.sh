#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"
rackup -I rackful/lib --port 8080 -w
