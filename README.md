# sst-maps

A full-stack serverless map example, with JWT authorization at the caching layer, built with Serverless-Stack (SST), NextJS, MapLibreGL JS, Protomaps on Amazon AWS

## Usage

Clone the repo. Install the dependencies. Setup a bucket and upload the pmtiles. Deploy to AWS.

```
$ git clone github.com/tyrauber/sst-maps
$ cd sst-mapsl; yarn;
$ yarn setup
$ yarn deploy --stage prod
```

Open the cloudfront url. Enjoy!

## Commands

### `npm run dev`

Starts the Live Lambda Development environment.

### `npm run build`

Build your app and synthesize your stacks.

### `npm run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `npm run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

## Documentation

Learn more about the SST.

- [Docs](https://docs.sst.dev/)
- [sst](https://docs.sst.dev/packages/sst)
