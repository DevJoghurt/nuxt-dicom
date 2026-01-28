import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: 'compatible',
  failOnWarn: false,
  externals: [
    '@nuxthealth/node-dicom',
  ],
})
