#!/usr/bin/env sh
set -eu

docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7
