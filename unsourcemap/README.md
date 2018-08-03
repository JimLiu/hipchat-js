UnSourceMap - Deobfuscate JavaScript code with source maps
==========================================================

`unsourcemap` will deobfuscate minified code using
[source maps](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/).
Source maps map compiled code back to the original code, including
mangled to original function and variable
names.

## Usage

This is an **extremely rough cut** by someone who doesn't know nodejs.

I don't even know how this works yet.

```
usage: unsourcemap.js <path-to-js> <path-to-source-map> <output-dir>
```
## Questions

- Does this correctly avoid path traversal attacks? (What if the source
  map lists a source URL of `..`?)
- Why does the source-map consumer not need a reference to the packed
  code? Is it finding it automatically? (Doubtful!) I thought source
  maps only encoded a set of deltas and missing information, not the whole
  source! Are all source maps like this, or is it an optional feature? If the
  latter, how *would* I combine the packed source with the map?
- Who wants to actually maintain this?
