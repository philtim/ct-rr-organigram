# Changelog

## [1.17.1](https://github.com/philtim/ct-rr-organigram/compare/v1.17.0...v1.17.1) (2026-10-16)


### Bug Fixes

* **changelog:** store the entries in KV value rows, the category data field caps at 2000 chars ([06fc9af](https://github.com/philtim/ct-rr-organigram/commit/06fc9af9c66317713fc924c1fac549526018cc1d))

## [1.17.0](https://github.com/philtim/ct-rr-organigram/compare/v1.16.4...v1.17.0) (2026-10-16)


### Features

* **admin:** button to fetch the Änderungsprotokoll ([fc8c698](https://github.com/philtim/ct-rr-organigram/commit/fc8c698568c2e9bf6ac53ea1130474a44369f386))
* **changelog:** admin sync composable ([9f3a914](https://github.com/philtim/ct-rr-organigram/commit/9f3a9140a9e5b8496916a5b331c24863998488e0))
* **changelog:** parse membership log lines and build the change log ([2e696c9](https://github.com/philtim/ct-rr-organigram/commit/2e696c9e855a1dac7f64d6395ef156d9967bf492))
* **changelog:** shared types, parse and read of the stored log ([a360cbe](https://github.com/philtim/ct-rr-organigram/commit/a360cbe45aab51830cd54be8b3a3a2fb0996016e))
* **dashboard:** Änderungsprotokoll panel ([f438da3](https://github.com/philtim/ct-rr-organigram/commit/f438da33645d5df87639548a0aefde1e9bc76ecc))


### Bug Fixes

* **changelog:** stop the status at the comma, treat an all-broken log as unreadable ([c77c5f2](https://github.com/philtim/ct-rr-organigram/commit/c77c5f23376baf88cff7712f322535bd101002d9))

## [1.16.4](https://github.com/philtim/ct-rr-organigram/compare/v1.16.3...v1.16.4) (2026-10-16)


### Bug Fixes

* **api:** give every read a deadline, not only the organigram's ([3d8a28f](https://github.com/philtim/ct-rr-organigram/commit/3d8a28f0a6c7cd41f9a83e3c5f5b7df67d4c27bd))
* **beitraege:** give every formula in the export its result ([afa7673](https://github.com/philtim/ct-rr-organigram/commit/afa76734b137e3da2057def7a400258101239444))

## [1.16.3](https://github.com/philtim/ct-rr-organigram/compare/v1.16.2...v1.16.3) (2026-10-15)


### Bug Fixes

* **beitraege:** say what "Teilnehmer gesamt" counts ([7157f36](https://github.com/philtim/ct-rr-organigram/commit/7157f3662a908b335b556ce91092ffe90717496e))

## [1.16.2](https://github.com/philtim/ct-rr-organigram/compare/v1.16.1...v1.16.2) (2026-10-15)


### Bug Fixes

* **dashboard:** give the Sammelgruppe card the Teilstamm card's design ([ce74eec](https://github.com/philtim/ct-rr-organigram/commit/ce74eecb9c850f29ae0599ace8ad6fd24b4bd383))

## [1.16.1](https://github.com/philtim/ct-rr-organigram/compare/v1.16.0...v1.16.1) (2026-10-15)


### Bug Fixes

* open every profile link in a new tab ([3df3be4](https://github.com/philtim/ct-rr-organigram/commit/3df3be48f9f30e7ae4a7b634b80529697d2b3aab))

## [1.16.0](https://github.com/philtim/ct-rr-organigram/compare/v1.15.1...v1.16.0) (2026-10-15)


### Features

* list who pays nothing and why, and link every name in the hints ([cdf1a52](https://github.com/philtim/ct-rr-organigram/commit/cdf1a52226a76bb5557d02427b6c314ba043049a))

## [1.15.1](https://github.com/philtim/ct-rr-organigram/compare/v1.15.0...v1.15.1) (2026-10-15)


### Bug Fixes

* **dashboard:** link the configuration to this extension, not the home page ([ea95403](https://github.com/philtim/ct-rr-organigram/commit/ea95403f811b614530e929fdcfa388c419e81b56))

## [1.15.0](https://github.com/philtim/ct-rr-organigram/compare/v1.14.0...v1.15.0) (2026-10-15)


### Features

* Sammelgruppen, setup access by role, and a dashboard that uses the width ([baf7cd5](https://github.com/philtim/ct-rr-organigram/commit/baf7cd5e4509c359e87d1f2d61b1a9f9ffe803b7))


### Bug Fixes

* **tabs:** keep the tab bar inside a phone's width ([25780a5](https://github.com/philtim/ct-rr-organigram/commit/25780a5c33477a44fd9512224382278bcae6b298))

## [1.14.0](https://github.com/philtim/ct-rr-organigram/compare/v1.13.1...v1.14.0) (2026-10-15)


### Features

* **admin:** make the setup screen say what to choose and why ([0c6ee87](https://github.com/philtim/ct-rr-organigram/commit/0c6ee87b19823e70d70d93516455ddce2d9c2b9b))


### Bug Fixes

* **dev:** log in with or without an existing session ([5f51e48](https://github.com/philtim/ct-rr-organigram/commit/5f51e48a51e0ef772623dbbb466976422ffecd57))


### Performance Improvements

* load the configuration screen only when it is opened ([fb3839a](https://github.com/philtim/ct-rr-organigram/commit/fb3839a1a269a066ddb1b0dc60d752680e5ce701))

## [1.13.1](https://github.com/philtim/ct-rr-organigram/compare/v1.13.0...v1.13.1) (2026-10-15)


### Bug Fixes

* **beitraege:** ignore whitespace when comparing street addresses ([3a51d21](https://github.com/philtim/ct-rr-organigram/commit/3a51d21543d2311ce2aa114efb23ae90f3b2415a))
* **beitraege:** never put people at different addresses in one family ([5092272](https://github.com/philtim/ct-rr-organigram/commit/50922728c4491bf69d0e3739916d0cabe3576a5e))

## [1.13.0](https://github.com/philtim/ct-rr-organigram/compare/v1.12.0...v1.13.0) (2026-10-10)


### Features

* **dashboard:** refuse a total over a partly loaded tree ([7af8300](https://github.com/philtim/ct-rr-organigram/commit/7af830054b12c46b086eea9d589c998472aab8e0))


### Bug Fixes

* **admin:** run the scope scan once when the form opens ([7d1f181](https://github.com/philtim/ct-rr-organigram/commit/7d1f1817906f4de151b36e49e9712bf9f7b790d4))
* **api:** read every paginated list the same way, without truncating ([87d6ecd](https://github.com/philtim/ct-rr-organigram/commit/87d6ecda671f7110f53e94d5bd4535fd7ac9ae82))
* **api:** stop at the last page the server reports ([55e1e2a](https://github.com/philtim/ct-rr-organigram/commit/55e1e2acc6f89824efe0502fa6d834fc774ee527))
* **beitraege:** find the relationship types instead of assuming their ids ([a740bea](https://github.com/philtim/ct-rr-organigram/commit/a740beabca3d6fe6ffe79cdba57ff1278e538311))
* **beitraege:** fix the due date once per load ([fcd48d5](https://github.com/philtim/ct-rr-organigram/commit/fcd48d52779f08100f64c28db6f6f15a2c13a496))
* **dashboard:** retry rate-limited group reads ([ee8cf06](https://github.com/philtim/ct-rr-organigram/commit/ee8cf06200e726d3e2735bddcbcba615cbc04440))
* **dev:** log in with a CSRF token so a stale session cannot blank the page ([a1dd353](https://github.com/philtim/ct-rr-organigram/commit/a1dd353a14a76410c09f8d954786c8bf9fc1eed0))
* **kv-store:** let a save replace a record whose data no longer parses ([a65a2da](https://github.com/philtim/ct-rr-organigram/commit/a65a2da2aee4ce0b01cd993929e60f28ea3e84ac))
* **kv-store:** treat an unreadable settings record as unreadable, not absent ([1029845](https://github.com/philtim/ct-rr-organigram/commit/102984550698843bb801f0b65ec6fceef039d191))
* make npm run typecheck check the sources ([a744f43](https://github.com/philtim/ct-rr-organigram/commit/a744f4371023034a216ed6712de94aa4b04477eb))
* say what could not be read instead of answering with nothing ([1307437](https://github.com/philtim/ct-rr-organigram/commit/13074377841328200d5ab3da6d42ab274a51b5d4))

## [1.12.0](https://github.com/philtim/ct-rr-organigram/compare/v1.11.0...v1.12.0) (2026-10-09)


### Features

* make every installation-specific value configurable ([13399eb](https://github.com/philtim/ct-rr-organigram/commit/13399eb0fb22af87cdfcfa802e7d04298ed5b524))
* **settings:** read the configuration without inventing defaults ([7fafc58](https://github.com/philtim/ct-rr-organigram/commit/7fafc58b7e773128f5ffadef52d3099f1a572c9b))


### Bug Fixes

* close two holes the security review found, and three the browser did ([b409388](https://github.com/philtim/ct-rr-organigram/commit/b409388567d8756aa3be35c6b40a724ef8d3796f))
* fail at the member page cap instead of truncating ([a5b392b](https://github.com/philtim/ct-rr-organigram/commit/a5b392bfc1bde7e60b6ecb0232c4708eff31c765))
* read every page of a group's members, and compare ages in one timezone ([8141a1d](https://github.com/philtim/ct-rr-organigram/commit/8141a1ddcac86ea306d1e29a8bdbb1b536b59e2d))
* work through the code review ([f2f78fc](https://github.com/philtim/ct-rr-organigram/commit/f2f78fcf9b84719ef2af589ff177df4a2e7a008d))

## [1.11.0](https://github.com/philtim/ct-rr-organigram/compare/v1.10.0...v1.11.0) (2026-10-09)


### Features

* **jahresmeldung:** add row totals and name the staff without a team ([ec76fb6](https://github.com/philtim/ct-rr-organigram/commit/ec76fb636aadf35fca3ab97933c9446d52cfec10))

## [1.10.0](https://github.com/philtim/ct-rr-organigram/compare/v1.9.1...v1.10.0) (2026-10-09)


### Features

* **jahresmeldung:** count the Bund's Mitgliederzahlen ([e1476e3](https://github.com/philtim/ct-rr-organigram/commit/e1476e3a5b0f7a4411898f4bd2120e3279a13cc3))


### Bug Fixes

* **kv-store:** send inMenu when creating the custom module ([1bddeed](https://github.com/philtim/ct-rr-organigram/commit/1bddeed28077e284faeb0bb30b2e13250419f4d0))

## [1.9.1](https://github.com/philtim/ct-rr-organigram/compare/v1.9.0...v1.9.1) (2026-10-09)


### Bug Fixes

* **beitraege:** zip the export without a Web Worker ([225f0d2](https://github.com/philtim/ct-rr-organigram/commit/225f0d26cb69f606fcf1fc1578335f169868c06d))

## [1.9.0](https://github.com/philtim/ct-rr-organigram/compare/v1.8.0...v1.9.0) (2026-10-09)


### Features

* **beitraege:** add the xlsx export ([a4b6c99](https://github.com/philtim/ct-rr-organigram/commit/a4b6c993ccc7de04a55a1e6dadb6b30119ce6bd2))
* **rr:** build the export rows from the fee assignments ([d59226a](https://github.com/philtim/ct-rr-organigram/commit/d59226a511e394dc638a9f1997bc2e608b6c7788))
* **rr:** carry the Teilstamm name through team resolution ([361cf7f](https://github.com/philtim/ct-rr-organigram/commit/361cf7f301f5b372fa54334c3ac77dc881c0a30d))

## [1.8.0](https://github.com/philtim/ct-rr-organigram/compare/v1.7.0...v1.8.0) (2026-10-08)


### Features

* **beitraege:** show the figures in the tab ([cd3825a](https://github.com/philtim/ct-rr-organigram/commit/cd3825a993f71960eb1dcefcb2e0fd7228aa30c9))


### Bug Fixes

* **rr:** let both role predicates take a whole role ([3a3d875](https://github.com/philtim/ct-rr-organigram/commit/3a3d875e04d95984ff7f1889142e656ee3fdcb1a))
* **rr:** make both tabs classify leaders by one shared rule ([cd95a7d](https://github.com/philtim/ct-rr-organigram/commit/cd95a7df666c910a92d0abb4877a59a6bd38c2ba))


### Performance Improvements

* **rr:** fetch the relationship graph in one request ([37e231a](https://github.com/philtim/ct-rr-organigram/commit/37e231a6a4c633d759a422d13add42b977cfdb5f))

## [1.7.0](https://github.com/philtim/ct-rr-organigram/compare/v1.6.0...v1.7.0) (2026-10-08)


### Features

* **beitraege:** point out that the tab is released to nobody ([ecb9b27](https://github.com/philtim/ct-rr-organigram/commit/ecb9b27c4cbba71724320a16a47881352e9cca94))
* **beitraege:** point out that the tab is released to nobody ([e368291](https://github.com/philtim/ct-rr-organigram/commit/e3682913f514e7739f253a53f2c7e3c5fbbf9ed6))


### Bug Fixes

* **admin:** send the full record when updating stored settings ([1a24ed0](https://github.com/philtim/ct-rr-organigram/commit/1a24ed0f8a9696f9e789c4e3850fdf9d69cb427a))
* **admin:** send the full record when updating stored settings ([4198c18](https://github.com/philtim/ct-rr-organigram/commit/4198c18669d739785682b6f620b66c3874a7cb2c))

## [1.6.0](https://github.com/philtim/ct-rr-organigram/compare/v1.5.0...v1.6.0) (2026-10-08)


### Features

* add Beitragsabrechnung tab with access rules and fee domain logic ([9dfdd2f](https://github.com/philtim/ct-rr-organigram/commit/9dfdd2f4f6a4f08e660fb2e3c7a18f1f10e3e85c))
* **rr:** add fee domain logic with Vitest coverage ([4e73e18](https://github.com/philtim/ct-rr-organigram/commit/4e73e18fc2b97e2f87eadbc93fb82978d6f1b4ac))
* **tabs:** add tab navigation with an empty Beitragsabrechnung tab ([6226502](https://github.com/philtim/ct-rr-organigram/commit/6226502fb11ce35dec97d78f4c2ca6d4f6c7c1bc))

## [1.5.0](https://github.com/philtim/ct-rr-organigram/compare/v1.4.0...v1.5.0) (2026-10-02)


### Features

* label leader lists by their actual group role ([#58](https://github.com/philtim/ct-rr-organigram/issues/58)) ([34ad979](https://github.com/philtim/ct-rr-organigram/commit/34ad9791f158939fd96fcb0b776716f40f3892e9))

## [1.4.0](https://github.com/philtim/ct-rr-organigram/compare/v1.3.0...v1.4.0) (2026-09-21)


### Features

* always show Horizont count and add Teilstamm total section ([#56](https://github.com/philtim/ct-rr-organigram/issues/56)) ([929838b](https://github.com/philtim/ct-rr-organigram/commit/929838b99f0febd634af5a1a37cb720a11f8db81))

## [1.3.0](https://github.com/philtim/ct-rr-organigram/compare/v1.2.0...v1.3.0) (2026-09-21)


### Features

* separate counts from names with divider, Horizont on own line ([#54](https://github.com/philtim/ct-rr-organigram/issues/54)) ([4b8bf61](https://github.com/philtim/ct-rr-organigram/commit/4b8bf614e22c3feeccb600f1982c645c9d7641dd))

## [1.2.0](https://github.com/philtim/ct-rr-organigram/compare/v1.1.0...v1.2.0) (2026-09-21)


### Features

* show Horizont order count on team chips and mobile teilstamm cards ([#52](https://github.com/philtim/ct-rr-organigram/issues/52)) ([c1fbf33](https://github.com/philtim/ct-rr-organigram/commit/c1fbf330cfbf342b71ab44befb38231c34e945c1))

## [1.1.0](https://github.com/philtim/ct-rr-organigram/compare/v1.0.0...v1.1.0) (2026-06-03)


### Features

* add hint where duplicate people count towards to ([d238464](https://github.com/philtim/ct-rr-organigram/commit/d2384644444392ddc12e9bd87f54f22f700f1c15))

## [1.0.0](https://github.com/philtim/ct-rr-organigram/compare/v0.0.14...v1.0.0) (2026-05-11)


### Miscellaneous Chores

* graduate to 1.0.0 and use standard semver bumps ([#49](https://github.com/philtim/ct-rr-organigram/issues/49)) ([545f3aa](https://github.com/philtim/ct-rr-organigram/commit/545f3aa8b0f88fd97cc10a5a5e62747cf0fcbf51))

## [0.0.14](https://github.com/philtim/ct-rr-organigram/compare/v0.0.13...v0.0.14) (2026-05-11)


### Features

* **duplicates:** surface cross-class double assignments ([#47](https://github.com/philtim/ct-rr-organigram/issues/47)) ([771637d](https://github.com/philtim/ct-rr-organigram/commit/771637d98ac9ea14de090275bb139c89c8f494c5))

## [0.0.13](https://github.com/philtim/ct-rr-organigram/compare/v0.0.12...v0.0.13) (2026-05-11)


### Bug Fixes

* **counts:** broaden Leiter definition and stop double-counting ([#45](https://github.com/philtim/ct-rr-organigram/issues/45)) ([9aa82d8](https://github.com/philtim/ct-rr-organigram/commit/9aa82d85c7fe10adc30d18c313a6ab9bcd0a0d53))

## [0.0.12](https://github.com/philtim/ct-rr-organigram/compare/v0.0.11...v0.0.12) (2026-05-06)


### Bug Fixes

* **ui:** exclude Co-Leiter from Stammleiter/Stammwart list ([#43](https://github.com/philtim/ct-rr-organigram/issues/43)) ([a76d37c](https://github.com/philtim/ct-rr-organigram/commit/a76d37cd9c7e93a24f15d630a53c1d217db0e1a6))

## [0.0.11](https://github.com/philtim/ct-rr-organigram/compare/v0.0.10...v0.0.11) (2026-05-06)


### Bug Fixes

* trigger patch release for stat tile order changes ([#41](https://github.com/philtim/ct-rr-organigram/issues/41)) ([5e0ab7a](https://github.com/philtim/ct-rr-organigram/commit/5e0ab7af8a63cd500ec6a798ac97989345c3b241))

## [0.0.10](https://github.com/philtim/ct-rr-organigram/compare/v0.0.9...v0.0.10) (2026-05-06)


### Bug Fixes

* **ui:** reorder Teilstamm tiles and shorten total label ([#38](https://github.com/philtim/ct-rr-organigram/issues/38)) ([6ede2d8](https://github.com/philtim/ct-rr-organigram/commit/6ede2d80dbf614b0627ad9baf3969f70facf52b7))

## [0.0.9](https://github.com/philtim/ct-rr-organigram/compare/v0.0.8...v0.0.9) (2026-05-06)


### Features

* **ui:** rename Mitglieder to Teilnehmer and add Stammgröße tile ([#35](https://github.com/philtim/ct-rr-organigram/issues/35)) ([9aa7924](https://github.com/philtim/ct-rr-organigram/commit/9aa7924d35b5c707c7b417205b06ba762b9f4d4a))

## [0.0.8](https://github.com/philtim/ct-rr-organigram/compare/v0.0.7...v0.0.8) (2026-05-06)


### Features

* **admin:** explicit Teilstamm picker, filter Teams to Kleingruppen ([#33](https://github.com/philtim/ct-rr-organigram/issues/33)) ([608badf](https://github.com/philtim/ct-rr-organigram/commit/608badf407528df2d78185caa5cc05fafdac7848))

## [0.0.7](https://github.com/philtim/ct-rr-organigram/compare/v0.0.6...v0.0.7) (2026-05-06)


### Bug Fixes

* **admin:** paginate group list and add searchable picker ([#31](https://github.com/philtim/ct-rr-organigram/issues/31)) ([a9649a0](https://github.com/philtim/ct-rr-organigram/commit/a9649a00b93729b18b3267cb73147827656f87bf))

## [0.0.6](https://github.com/philtim/ct-rr-organigram/compare/v0.0.5...v0.0.6) (2026-05-06)


### Features

* **app:** show admin form directly when not yet configured ([#30](https://github.com/philtim/ct-rr-organigram/issues/30)) ([6eb3380](https://github.com/philtim/ct-rr-organigram/commit/6eb3380d1849bf8f1cf8a26d7a2b3b9161435109))


### Bug Fixes

* **dashboard:** snappier hover, stronger contrast, inset hover surface ([#28](https://github.com/philtim/ct-rr-organigram/issues/28)) ([c45dc97](https://github.com/philtim/ct-rr-organigram/commit/c45dc979333b478227aafca4abf47e273054bfe2))

## [0.0.5](https://github.com/philtim/ct-rr-organigram/compare/v0.0.4...v0.0.5) (2026-05-06)


### Bug Fixes

* **dashboard:** clean group link URL and polish hover affordance ([#26](https://github.com/philtim/ct-rr-organigram/issues/26)) ([1be5030](https://github.com/philtim/ct-rr-organigram/commit/1be50300ac503e4f3b78e27c2dac4287fbbb2f67))

## [0.0.4](https://github.com/philtim/ct-rr-organigram/compare/v0.0.3...v0.0.4) (2026-05-06)


### Features

* **dashboard:** link cards/chips to ChurchTools groups ([#24](https://github.com/philtim/ct-rr-organigram/issues/24)) ([3564837](https://github.com/philtim/ct-rr-organigram/commit/3564837f6e0943a1e09162017ccbf2dbc0e730f3))

## [0.0.3](https://github.com/philtim/ct-rr-organigram/compare/v0.0.2...v0.0.3) (2026-05-05)


### Features

* **dashboard:** show full build info on footer hover ([#21](https://github.com/philtim/ct-rr-organigram/issues/21)) ([95ad2a2](https://github.com/philtim/ct-rr-organigram/commit/95ad2a2d59e46e91b1e24623c9a721b695156d71))


### Bug Fixes

* **dashboard:** extend background edge-to-edge of viewport ([#23](https://github.com/philtim/ct-rr-organigram/issues/23)) ([ac7e73f](https://github.com/philtim/ct-rr-organigram/commit/ac7e73fbfd9f6cb864fef3091e259a5dda33f257))
