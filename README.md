# Offline-Todo-SPA-Example

Extensive offline-ready installable todo list example using Typescript + React + Vite.
Demonstrates some useful features available in Service Workers.

Note: I feel like workbox may be used as a base to build a robust and easy-to-use PWA library.
There are some system/architecture level problems preventing it. Will try to solve them in the future.

## Features

* Installable
* Can be opened without network available
* Visual indication if received data is fresh or stale
* "Auto refetch on online" for failed requests
* Background sync updates notification coverage

## How to use

### Development

```shell
cd backend
yarn
yarn start 
cd ../frontend
yarn
yarn dev
```

By default, frontend is being hosted on http://localhost:5173/

### Production

```shell
cd backend
yarn
yarn start 
cd ../frontend
yarn
yarn build
```

By default, application is being hosted on http://localhost:3001/