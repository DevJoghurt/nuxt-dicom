# Nuxt Dicom

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Use dicom tools inside your nuxt project

## Features

- 🛠️ &nbsp;Run a Rust-based StoreSCP alongside the Node server
- 🌐 &nbsp;User-friendly API and UI for process management
- 📄 &nbsp;Read and create DICOM files effortlessly
- 📤 &nbsp;StoreSCU for sending DICOM files

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-dicom
```

That's it! You can now use My Module in your Nuxt app ✨


## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch

  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxthealth/dicom/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@nuxthealth/dicom

[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxthealth/dicom.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@nuxthealth/dicom

[license-src]: https://img.shields.io/npm/l/@nuxthealth/dicom.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@nuxthealth/dicom

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
