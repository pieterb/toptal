#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"
rackup -I rackful/lib -I yaks/lib --port 8080 -w
