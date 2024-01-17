echo Setting up Fedora env for NPM support

# NPM on deno requires temp directory which is on same partition
# otherwise cross-device link (error 18) occurs
mkdir -p temp
export TMPDIR=$(pwd)/temp