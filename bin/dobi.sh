#!/usr/bin/env sh

BASEDIR=$( dirname "$0" )
node --experimental-modules $BASEDIR/../lib/cli "$@"
