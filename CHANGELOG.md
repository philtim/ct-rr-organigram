# Changelog

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
