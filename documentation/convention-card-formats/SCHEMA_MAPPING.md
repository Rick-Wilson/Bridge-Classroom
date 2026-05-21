# Cross-format field mapping

A row-by-row mapping of every convention-card concept across the four
schemas we touch:

1. **`card_data`** — our internal JSON shape used by the editor.
   Documented in [src/utils/conventionCatalog.js](../../src/utils/conventionCatalog.js)
   and [CONVENTION_CARDS.md](../CONVENTION_CARDS.md).
2. **Bridgeodex JSON** — the `settings.*` shape used by
   [bridgeodex.com](https://bridgeodex.com)'s exporter.
   Importer reads it in [src/utils/bridgeodexImport.js](../../src/utils/bridgeodexImport.js).
3. **ACBL Classic 2023** — fillable PDF form field names
   ([acbl-classic-2023-blank.pdf](acbl-classic-2023-blank.pdf)).
   Filler in [src/utils/acblClassicFillPdf.js](../../src/utils/acblClassicFillPdf.js).
4. **ACBL New** — fillable PDF for the redesigned card
   ([acbl-new-blank.pdf](acbl-new-blank.pdf)). Uses a clean
   hierarchical naming scheme: `<SECTION>.<c|t>.<N>` where `c` =
   checkbox and `t` = text. Section codes:
   - `Name` (partner names)
   - `OV` (Overview / general approach)
   - `1C`, `1D`, `1H1S` (1♣, 1♦, 1♥/1♠ openings)
   - `1NT`, `2NT`, `3NT` (NT openings)
   - `2C`, `2D`, `2H`, `2S` (2-level openings)
   - `O` (Other conventional calls)
   - `D` (Doubles)
   - `OC` (Overcalls — simple + jump combined)
   - `NTO` (NT overcalls)
   - `V1NT` (Defense vs 1NT)
   - `VTD` (Vs Takeout Double)
   - `VP` (Vs Preempts)
   - `P` (Opening Preempts)
   - `DC` (Direct Cuebids)
   - `SL` (Slams)
   - `C` (Defensive Carding)
   - `SI` (Signals)
   - `LS`, `LN` (Leads vs Suits / vs NT)

Empty cell = no equivalent in that format (the concept isn't on that
card, or isn't supported by that exporter). Cells marked **TBD** are
known to exist but the specific field name hasn't been identified yet.

For checkboxes whose value is an enum (e.g. `meaning: 'very_strong'`),
the bridgeodex column shows the truthy key whose `"on"` value triggers
the enum, and the ACBL field is checked when our enum matches.

---

## Identification / overview

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Partner names | `metadata.partner_names` | `settings.names.names` | `NAMES` | `Name.t.1` |
| System name | `general.system` | `settings.overview.general_approach` | `GENERAL APPROACH` | `OV.t.1` |
| Two-over-one game forcing | `major_openings.two_over_one.game_force` | (derived from approach) | `Two Over One Game Forcing` | (no field) |
| Forcing 1♣ opening | `general.forcing_opening_1c` | `settings.overview.forcing_1c` | `FORCING OPENING 1c` | `OV.c.4` |
| Forcing 2♣ opening | `general.forcing_opening_2c` | `settings.overview.forcing_2c` | `2c` | `OV.c.5` |
| Forcing-other text | `general.forcing_opening_other` | (n/a) | `undefined_4` | `OV.t.6` |
| 1NT opening style — Strong | `general.nt_open_style = 'strong'` | `settings.overview.1nt_open_str` | (no field) | `OV.c.7` |
| 1NT opening style — Weak | `general.nt_open_style = 'weak'` | `settings.overview.1nt_open_wk` | (no field) | `OV.c.8` |
| 1NT opening style — Variable | `general.nt_open_style = 'variable'` | `settings.overview.1nt_open_variable` | (no field) | `OV.c.9` |
| Very light openings | `general.very_light.openings` | (n/a) | `Openings` | (no field) |
| Very light 3rd hand | `general.very_light.third_hand` | (n/a) | `3rd Hand` | (no field) |
| Very light overcalls | `general.very_light.overcalls` | (n/a) | `Overcalls` | (no field) |
| Very light preempts | `general.very_light.preempts` | (n/a) | `Preempts` | (no field) |
| Min HCP to open (balanced) | `general.min_hcp_open` | `settings.overview.min_exp_hcp_bal_opening` | (no field) | `OV.t.2` |
| Min HCP to respond | `general.min_hcp_respond` | `settings.overview.min_exp_hcp_bal_responding` | (no field) | `OV.t.3` |
| Bids requiring prep | `general.bids_requiring_prep` | `settings.overview.bids_prep` | (no field) | `OV.t.10` |

## NT openings — 1NT

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 1NT range (primary) min | `notrump.one_nt.range_min` | `settings["1_no_trump"].a_range_min` | `to_4` | `1NT.t.1` |
| 1NT range (primary) max | `notrump.one_nt.range_max` | `settings["1_no_trump"].a_range_max` | `to_1_2` | `1NT.t.2` |
| 1NT seat/vul | `notrump.one_nt.seat_vul` | (suffix on a_range_min/max) | (no field) | `1NT.t.3` |
| 1NT range (alternate) min | `notrump.one_nt_alt.range_min` | `settings["1_no_trump"].b_range_min` | `to_6` | (similar `1NT.t.*`) |
| 1NT range (alternate) max | `notrump.one_nt_alt.range_max` | `settings["1_no_trump"].b_range_max` | `to_2_2` | (similar `1NT.t.*`) |
| Alternate seat/vul | `notrump.one_nt_alt.seat_vul` | (suffix on b_range_min/max) | (no field) | (alt-range seat/vul `1NT.t.*`) |
| Alternate same responses | `notrump.one_nt_alt.same_responses` | `b_range_same_resp` | (no field) | (Same Resp Y/N `1NT.c.*`) |
| May contain 5-card major | `notrump.one_nt.five_card_major` | `["1_no_trump"]["5_card_major"]` | `5card Major common` | `1NT.c.4` |
| Systems on vs | `notrump.one_nt.sys_on_vs` | `["1_no_trump"].sys_on_vs` | `System on over` | `1NT.t.5` |
| Stayman (2♣) | `notrump.stayman.forcing` | `["1_no_trump"]["2c_stayman"]` | `2c Stayman` | `1NT.c.6` |
| Forcing Stayman | `notrump.stayman.forcing` (same flag) | (same) | `Forcing Stayman` | (subsumed in `1NT.c.6` or `.c.7`) |
| Garbage Stayman | `notrump.stayman.garbage` | (no key) | (no field) | (subsumed) |
| Puppet Stayman (over 1NT) | `notrump.stayman.puppet` | `["1_no_trump"]["2c_puppet"]` | `Puppet` | `1NT.c.7` |
| Jacoby transfers (2♦→♥) | `notrump.transfers.jacoby` | `["1_no_trump"]["2d_tfr"]` | `2d Transfer to h` | `1NT.c.9` |
| Jacoby transfers (2♥→♠) | `notrump.transfers.jacoby` | `["1_no_trump"]["2h_tfr"]` | `2h Transfer to s` | `1NT.c.12` |
| Texas transfers (umbrella) | `notrump.transfers.texas` | (any tfr_4c/4d/4h) | `4d  4h  Transfer` | (in 1NT.c.21–24 Smolen/Texas row) |
| Smolen | `notrump.smolen.play` | `["1_no_trump"].smolen` | `Smolen` | `1NT.c.21` |
| Lebensohl over interference | `notrump.lebensohl.over_interference` | `lebensohl` | `Lebensohl` | `1NT.c.39` |
| Lebensohl description | `notrump.lebensohl.description` | `lebensohl_desc` | `denies Conventional NT Openings` | `1NT.t.40` |
| 1NT Dbl is Negative | `notrump.dbl.negative` | `dbl_neg` | `Neg Double` | `1NT.c.25` |
| 1NT Dbl is Penalty | `notrump.dbl.penalty` | `dbl_pen` | (no field) | `1NT.c.27` |
| Negative dbl notes | `notrump.dbl.negative_desc` | `dbl_neg_desc` | (no field) | `1NT.t.26` |
| Other dbl notes | `notrump.dbl.other` | `dbl_other` | (no field) | `1NT.t.38` |
| 2♦ response (text) | `notrump.responses.2d_other` | `["1_no_trump"]["2d_other"]` | (no field) | `1NT.t.11` |
| 2♥ response (text) | `notrump.responses.2h_other` | `["1_no_trump"]["2h_other"]` | (no field) | `1NT.t.14` |
| 2♠ response (text) | `notrump.responses.2s_other` | `["1_no_trump"]["2s_other"]` | `2s` | `1NT.t.17` |
| 2NT response (text) | `notrump.responses.2nt_other` | `["1_no_trump"]["2nt_other"]` | `2NT_2` | `1NT.t.20` |
| 3♣ response | `notrump.responses.3c` | `["1_no_trump"]["3c"]` | `NOTRUMP OPENING BIDS` | `1NT.t.32` |
| 3♦ response | `notrump.responses.3d` | `["1_no_trump"]["3d"]` | `3d` | `1NT.t.33` |
| 3♥ response | `notrump.responses.3h` | `["1_no_trump"]["3h"]` | `3h 1` | `1NT.t.34` |
| 3♠ response | `notrump.responses.3s` | `["1_no_trump"]["3s"]` | `3h 2` | `1NT.t.35` |

## NT openings — 2NT

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 2NT range min | `notrump.two_nt.range_min` | `["2_no_trump"].range_min` | `2NT` | `2NT.t.1` |
| 2NT range max | `notrump.two_nt.range_max` | `["2_no_trump"].range_max` | `to_5` | `2NT.t.2` |
| 2NT Puppet | `notrump.two_nt.puppet` | `["2_no_trump"].puppet` | `Puppet Stayman` | `2NT.c.3` |
| 2NT Puppet desc | (n/a) | (n/a) | (subsumed) | `2NT.t.5` |
| 2NT Conv | (n/a) | (n/a) | (subsumed) | `2NT.c.6` |
| 2NT Conv text | (n/a) | (n/a) | (subsumed) | `2NT.t.7` |
| 2NT Jacoby transfers (3-level) | `notrump.two_nt.transfers_3level` | `["2_no_trump"].tfr_3lvl` | `Jacoby` | `2NT.c.8` |
| 2NT Texas transfers (4-level) | `notrump.two_nt.transfers_4level` | `["2_no_trump"].tfr_4lvl` | `Texas` | `2NT.c.9` |
| 2NT Neg Dbl | `notrump.two_nt.neg_dbl` | `["2_no_trump"].neg_dbl` | (no field) | `2NT.c.10` |
| 2NT 3♠ relay | `notrump.two_nt.three_s` | `["2_no_trump"]["3s"]` | (no field) | `2NT.c.4` |
| 2NT 3♠ relay desc | `notrump.two_nt.three_s_desc` | `["2_no_trump"]["3s_desc"]` | `undefined_6` | (subsumed in `2NT.t.5`) |
| 2NT notes | `notrump.two_nt.notes` | `["2_no_trump"].other` | (no field) | `2NT.t.11` |

## NT openings — 3NT

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 3NT range min | `three_nt.range_min` | `["3_no_trump"].range_min` | `to_7` | `3NT.t.1` |
| 3NT range max | `three_nt.range_max` | `["3_no_trump"].range_max` | `undefined_8` | `3NT.t.2` |
| 3NT one suit (gambling) | `three_nt.one_suit` | `["3_no_trump"].one_suit` | (no field) | `3NT.c.3` |
| 3NT one-suit desc | `three_nt.one_suit_desc` | `["3_no_trump"].one_suit_desc` | (no field) | `3NT.t.4` |

## Major openings

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Min length 1st/2nd seat = 4 | `major_openings.min_length_1st_2nd = '4'` | `majors.min_len_1st_2nd_4` | `1st/2nd 4` | `1H1S.c.1` |
| Min length 1st/2nd seat = 5 | `major_openings.min_length_1st_2nd = '5'` | `majors.min_len_1st_2nd_5` | `1st/2nd 5` | `1H1S.c.2` |
| Min length 3rd/4th seat = 4 | `major_openings.min_length_3rd_4th = '4'` | `majors.min_len_3rd_4th_4` | `3rd/rth 4` | `1H1S.c.3` |
| Min length 3rd/4th seat = 5 | `major_openings.min_length_3rd_4th = '5'` | `majors.min_len_3rd_4th_5` | `3rd/rth 5` | `1H1S.c.4` |
| 1NT response is forcing | `major_openings.one_nt_response.forcing` | `majors["1nt_forcing"]` | `1NT  Forcing` | `1H1S.c.5` |
| 1NT response is semi-forcing | `major_openings.one_nt_response.semi_forcing` | `majors["1nt_semi_forcing"]` | `Semiforcing` | `1H1S.c.6` |
| Bypass 1♠ over 1♥ | `major_openings.one_nt_response.bypass_1s` | `majors.bypass_1s` | (no field) | `1H1S.c.7` |
| Jacoby 2NT | `major_openings.jacoby_2nt.play` | `majors.art_raises_2nt` | `Conv Raise 2NT` | `1H1S.c.8` |
| Splinter raises | `major_openings.splinters.play` | `majors.art_raises_splinter` | `Splinter` | `1H1S.c.10` |
| Art raises: 3NT (4333) | `major_openings.three_nt_raise.play` | `majors.art_raises_3nt` | `Conv Raise 3NT` | `1H1S.c.9` |
| Art raises: other (text) | `major_openings.art_raises_other` | `majors.art_raises_other` | `Other_5` | `1H1S.t.11` |
| Jump raise — Weak | `major_openings.jump_raise.weak` | `majors.jump_raise_weak` | `Weak_3` | `1H1S.c.17` |
| Jump raise — Mixed | `major_openings.jump_raise.mixed` | `majors.jump_raise_mixed` | (no field) | `1H1S.c.18` |
| Jump raise — Invitational | `major_openings.jump_raise.inv` | `majors.jump_raise_inv` | `Inv_3` | `1H1S.c.19` |
| Jump raise after overcall — Weak | `major_openings.jump_raise_after_overcall.weak` | `majors.jump_raise_overcall_weak` | `Weak_4` | `1H1S.c.20` |
| Jump raise after overcall — Mixed | `major_openings.jump_raise_after_overcall.mixed` | `majors.jump_raise_overcall_mixed` | (no field) | `1H1S.c.21` |
| Jump raise after overcall — Inv | `major_openings.jump_raise_after_overcall.inv` | `majors.jump_raise_overcall_inv` | `Inv_5` | `1H1S.c.22` |
| Drury | `major_openings.drury.play` | `majors.drury_2c` (or any drury_*) | `Drury` | `1H1S.c.12` |
| Reverse Drury | `major_openings.drury.reverse` | (default for `drury_2c`) | `Reverse` | `1H1S.c.13` |
| Drury — In competition | `major_openings.drury.in_comp` | `majors.drury_in_comp` | (no field) | `1H1S.c.14` |
| Drury notes | (n/a) | `majors.drury_other` | (no field) | `1H1S.t.15` |
| 2-Way Drury | `major_openings.drury.two_d` | `majors.drury_2d` | `2Way` | (no separate field) |
| Drury Fit (BTW) | `major_openings.drury.fit` | (no key) | `Fit` | (no field) |
| 2NT response forcing | `major_openings.two_nt_response_forcing` | (no key) | `2NT  Forcing` | (no field on New) |
| 2NT response inv | `major_openings.two_nt_response_inv` | (no key) | `Inv_7` | (no field on New) |
| Major notes (Other) | `major_openings.notes` | `majors.more` | `undefined_16` | `1H1S.t.16` |
| Major notes 2 | `major_openings.bergen_raises_notes` | `majors.other` | (subsumed in `Other_5`) | `1H1S.t.16b` |

## Minor openings

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 1♣ min length = 5 | `minor_openings.one_club.min_length = '5'` | `minors["1c_min_len_5"]` | (no field) | `1C.c.1` |
| 1♣ min length = 4 | `minor_openings.one_club.min_length = '4'` | `minors["1c_min_len_4"]` | `1c 4` | `1C.c.2` |
| 1♣ min length = 3 | `minor_openings.one_club.min_length = '3'` | `minors["1c_min_len_3"]` | `1c 3` | `1C.c.3` |
| 1♣ min length = 2 (4432 only) | `minor_openings.one_club.nf2` | `minors["1c_nf2"]` | (no field) | `1C.c.4` (or .c.5) |
| 1♣ unbalanced | `minor_openings.one_club.unbalanced` | `minors["1c_unbal"]` | (no field) | (subsumed) |
| 1♣ NF 1 | `minor_openings.one_club.nf1` | `minors["1c_nf1"]` | `1c NF` | `1C.c.6` |
| 1♣ NF 0 | `minor_openings.one_club.nf0` | `minors["1c_nf0"]` | (no field) | `1C.c.7` |
| 1♣ Art F | `minor_openings.one_club.art_forcing` | `minors["1c_art_f"]` | `1c conv` | `1C.c.8` |
| 1♣ Resp notes | (n/a) | (n/a) | (no field) | `1C.t.9` |
| 1♣ Transfer Resp | `minor_openings.one_club.transfer_resp` | `minors["1c_transfer_resp"]` | `Transfer Resp_2` | `1C.c.10` |
| 1♣ continuation text | (n/a) | (n/a) | (no field) | `1C.t.11` |
| 1♦ over 1♣ text | (n/a) | (n/a) | (no field) | `1C.t.12` |
| Bypass 5+ ♦ to bid major | `minor_openings.bypass_5_plus` | `minors["1c_1d_bypass_5"]` | `Freq bypass 4d` | `1C.c.13` |
| 1♣ 1NT range min (Bergen) | `minor_openings.one_club.one_nt_range_min` | `minors["1c_1nt_min"]` | `to_9` | `1C.t.14` |
| 1♣ 1NT range max | `minor_openings.one_club.one_nt_range_max` | `minors["1c_1nt_max"]` | `to_11` | `1C.t.15` |
| 1♣ 2NT range min | `minor_openings.one_club.two_nt_range_min` | `minors["1c_2nt_min"]` | `undefined_12` | `1C.t.16` |
| 1♣ 2NT range max | `minor_openings.one_club.two_nt_range_max` | `minors["1c_2nt_max"]` | `undefined_13` | `1C.t.17` |
| 1♣ Single raise — NF | `minor_openings.one_club.single_raise.nf` | `minors["1c_single_raise_nf"]` | `Single raise` | `1C.c.18` |
| 1♣ Single raise — Inv+ | `minor_openings.one_club.single_raise.inv` | `minors["1c_single_raise_inv"]` | (subsumed) | `1C.c.19` |
| 1♣ Single raise — GF | `minor_openings.one_club.single_raise.gf` | `minors["1c_single_raise_gf"]` | (subsumed) | `1C.c.20` |
| 1♣ Jump raise — Weak | `minor_openings.one_club.jump_raise.weak` | `minors["1c_jump_raise_weak"]` | `Weak_5` | `1C.c.21` |
| 1♣ Jump raise — Mixed | `minor_openings.one_club.jump_raise.mixed` | `minors["1c_jump_raise_mixed"]` | (no field) | `1C.c.22` |
| 1♣ Jump raise — Inv | `minor_openings.one_club.jump_raise.inv` | `minors["1c_jump_raise_inv"]` | `Inv_4` | `1C.c.23` |
| 1♣ Jump raise (after overcall) — Weak | `minor_openings.one_club.jump_raise_after_overcall.weak` | `minors["1c_jump_raise_overcall_weak"]` | `Weak_6` | `1C.c.24` |
| 1♣ Jump raise (after overcall) — Mixed | `minor_openings.one_club.jump_raise_after_overcall.mixed` | `minors["1c_jump_raise_overcall_mixed"]` | (no field) | `1C.c.25` |
| 1♣ Jump raise (after overcall) — Inv | `minor_openings.one_club.jump_raise_after_overcall.inv` | `minors["1c_jump_raise_overcall_inv"]` | `Inv_6` | `1C.c.26` |
| 1♦ min length = 5 | `minor_openings.one_diamond.min_length = '5'` | `minors["1d_min_len_5"]` | (no field) | `1D.c.1` |
| 1♦ min length = 4 | `minor_openings.one_diamond.min_length = '4'` | `minors["1d_min_len_4"]` | `1d 4` | `1D.c.2` |
| 1♦ min length = 3 | `minor_openings.one_diamond.min_length = '3'` | `minors["1d_min_len_3"]` | `1d 3` | `1D.c.3` |
| 1♦ unbalanced | `minor_openings.one_diamond.unbalanced` (?) | (no key) | (no field) | `1D.c.4` |
| 1♦ NF2 (4432 only) | `minor_openings.one_diamond.nf2_4432_only` | `minors["1d_4432_only"]` | `1d NF` | `1D.c.5` |
| 1♦ NF 1 | (n/a) | (no key) | (no field) | `1D.c.6` |
| 1♦ NF 0 | (n/a) | (no key) | (no field) | `1D.c.7` |
| 1♦ Art F | `minor_openings.one_diamond.art_forcing` | (n/a) | `1d conv` | `1D.c.8` |
| 1♦ Resp notes | (n/a) | (n/a) | (no field) | `1D.t.9` |
| 1♦ same as over 1♣ | `minor_openings.one_diamond.same_as_1c` | `minors["1d_same_as_1c"]` | (no field) | `1D.c.10` |
| 1♦ continuation text | (n/a) | (n/a) | (no field) | `1D.t.11` |
| 1♦ 1NT range min | `minor_openings.one_diamond.one_nt_range_min` (?) | (n/a) | (no field) | `1D.t.12` |
| 1♦ 1NT range max | `minor_openings.one_diamond.one_nt_range_max` (?) | (n/a) | (no field) | `1D.t.13` |
| 1♦ 2NT range min | `minor_openings.one_diamond.two_nt_range_min` (?) | (n/a) | (no field) | `1D.t.14` |
| 1♦ 2NT range max | `minor_openings.one_diamond.two_nt_range_max` (?) | (n/a) | (no field) | `1D.t.15` |
| 1♦ Single raise — NF | (n/a) | (n/a) | (no field) | `1D.c.16` |
| 1♦ Single raise — Inv+ | (n/a) | (n/a) | (no field) | `1D.c.17` |
| 1♦ Single raise — GF | (n/a) | (n/a) | (no field) | `1D.c.18` |
| 1♦ Jump raise — Weak | (n/a) | (n/a) | (no field) | `1D.c.19` |
| 1♦ Jump raise — Mixed | (n/a) | (n/a) | (no field) | `1D.c.20` |
| 1♦ Jump raise — Inv | (n/a) | (n/a) | (no field) | `1D.c.21` |
| 1♦ Jump raise (after overcall) — Weak | (n/a) | (n/a) | (no field) | `1D.c.22` |
| 1♦ Jump raise (after overcall) — Mixed | (n/a) | (n/a) | (no field) | `1D.c.23` |
| 1♦ Jump raise (after overcall) — Inv | (n/a) | (n/a) | (no field) | `1D.c.24` |
| Inverted minors (J/S) | `minor_openings.inverted_minors.play` | (derived) | `Forcing Raise JS in other minor` | (no separate field on New) |
| Minor notes | `minor_openings.notes` | `minors["1c_1d"]` | `to_12` | (subsumed in `1C.t.11`/`1D.t.11`) |

## Two-level openings — 2♣

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 2♣ min HCP | `two_level.two_clubs.min_hcp_str` | `two_level["2c_min"]` | `Other_7` | `2C.t.1` |
| 2♣ max HCP | `two_level.two_clubs.max_hcp` | (none) | `to_13` | `2C.t.2` |
| 2♣ description | `two_level.two_clubs.description` | (n/a) | `2C Force New describe` | `2C.t.3a` |
| 2♣ → 2♦ Negative | `two_level.two_clubs.2d_response = 'negative'` | `two_level["2c_2d_neg"]` | `2d Resp  Neg` | `2C.c.3b` |
| 2♣ → 2♦ Waiting | `two_level.two_clubs.2d_response = 'waiting'` | `two_level["2c_2d_waiting"]` | `Waiting` | `2C.c.4` |
| 2♣ → 2♥ steps | `two_level.two_clubs.2h_response = 'steps'` | `two_level["2c_2h_steps"]` | (no field) | `2C.c.5` |
| 2♣ → 2♥ steps text | (n/a) | (n/a) | (no field) | `2C.t.6` |
| 2♣ → 2♥ Negative | `two_level.two_clubs.2h_response = 'negative'` | `two_level["2c_2h_neg"]` | (no field) | `2C.c.7` |
| 2♣ meaning = Very strong | `two_level.two_clubs.meaning = 'very_strong'` | `two_level["2c_very_str"]` | `Very Strong` | `2C.c.8` |
| 2♣ meaning = Strong | `two_level.two_clubs.meaning = 'strong'` | `two_level["2c_str"]` | `Other_8` | `2C.c.9` |
| 2♣ meaning = Natural | `two_level.two_clubs.meaning = 'natural'` | `two_level["2c_nat"]` | (same) | `2C.c.10` |
| 2♣ meaning = Conv | `two_level.two_clubs.meaning = 'conventional'` | `two_level["2c_conv"]` | (same) | `2C.c.11` |
| 2♣ meaning notes | (n/a) | (n/a) | (no field) | `2C.t.12` |
| 2♣ responses/rebids (Other) | `two_level.two_clubs.notes` | `two_level["2c_other"]` | `2C Force New Suit NFRow1` | `2C.t.13` |

## Two-level openings — 2♦ / 2♥ / 2♠

Each opening has a parallel set of fields. Substitute `<suit>` ∈ {`diamonds`, `hearts`, `spades`} and `<X>` ∈ {`d`, `h`, `s`}.

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 2X min HCP | `two_level.two_<suit>.min_hcp` | `two_level["2<X>_min"]` | `2<X>_2` | `2<X>.t.1` (e.g. `2D.t.1`) |
| 2X max HCP | `two_level.two_<suit>.max_hcp` | `two_level["2<X>_max"]` | `to_14`/`to_15`/`to_16` | `2<X>.t.2` |
| Meaning notes / desc | `two_level.two_<suit>.description` | `two_level["2<X>_desc"]` | (subsumed) | `2<X>.t.3` |
| Meaning = Weak | `two_level.two_<suit>.meaning = 'weak'` | `two_level["2<X>_weak"]` | `NaturalWeak`/`_2`/`_3` | `2<X>.c.4` (or .c.5) |
| Meaning = Intermediate | `two_level.two_<suit>.meaning = 'intermediate'` | `two_level["2<X>_int"]` | `Intermediate_2`/`_3`/`_4` | `2<X>.c.5` (or .c.6) |
| Meaning = Strong | `two_level.two_<suit>.meaning = 'strong'` | `two_level["2<X>_str"]` | `Strong_2`/`_3`/`_4` | `2<X>.c.6` (or .c.7) |
| Meaning = Conv | `two_level.two_<suit>.meaning = 'conventional'` | `two_level["2<X>_conv"]` | `Conv_3`/`_4`/`_5` | `2<X>.c.7` (or .c.8) |
| 2-suited | `two_level.two_<suit>.two_suited` | `two_level["2<X>_2suits"]` | (subsumed in NSNF row) | `2<X>.c.8` |
| Rebids over 2NT | (n/a) | `two_level["2<X>_rebids_2nt"]` | (subsumed) | `2<X>.t.9` |
| New suit non-forcing | `two_level.two_<suit>.new_suit_nf` | `two_level["2<X>_nsnf"]` | `New Suit NF`/`_2`/`_3` | (in `2<X>.t.10`) |
| Responses/rebids (Other) | `two_level.two_<suit>.notes` | `two_level["2<X>_other"]` | `2D Force New Suit NFRow1` (etc.) | `2<X>.t.10` |

## Other conventional calls

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Jump Shift Resp | `other_conventions.jump_shift_response` | `other.jump_shift_resp` | (no field) | `O.t.1` |
| Vs (Very) Str Open | `other_conventions.vs_strong_open` | `other.vs_str_open` | (no field) | `O.t.2` |
| New minor forcing | `other_conventions.new_minor_forcing.play` | `other.nmf` | `OTHER CONV CALLS New Minor Forcing` | `O.c.3` |
| 2-Way NMF | `other_conventions.two_way_nmf` | `other["2_way_nmf"]` | `2Way NMF` | `O.c.4` |
| XYZ | `other_conventions.xyz` | `other.xyz` | (no field) | `O.c.5` |
| 4th-suit forcing — 1 round | `other_conventions.fourth_suit_forcing.one_round` | `other.fsf_1_rnd` | `4th  Suit  Forcing  1 Rd` | `O.c.6` |
| 4th-suit forcing — Game | `other_conventions.fourth_suit_forcing.game_force` | `other.fsf_gf` | `Game` | `O.c.7` |
| Other notes 1 | (n/a) | (n/a) | (no field) | `O.t.8` |
| Other notes 2 | (n/a) | (n/a) | (no field) | `O.t.9` |
| Weak Jump Shifts in comp | `other_conventions.weak_jump_shifts_in_comp` | (n/a) | `Weak  Jump  Shifts  In  Comp` | (no field on New) |
| Weak Jump Shifts not in comp | `other_conventions.weak_jump_shifts_not_in_comp` | (n/a) | `Not  in  Comp` | (no field on New) |

## Special doubles

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Negative doubles | `doubles.negative.play` | `doubles.negative` | `Negative` | `D.c.1` |
| Negative thru | `doubles.negative.through` | `doubles.negative_thru` | `thru` | `D.t.2` |
| After overcall — Penalty | `doubles.after_overcall_penalty` | (n/a) | `After Overcall Penalty` | `D.c.3` |
| Responsive doubles | `doubles.responsive.play` | `doubles.responsive` | `Responsive` | `D.c.4` |
| Responsive thru | `doubles.responsive.through` | `doubles.responsive_thru` | `thru_2` | `D.t.5` |
| Maximal doubles | `doubles.maximal` | `doubles.maximal` | `Maximal` | `D.c.6` |
| Support doubles | `doubles.support.play` | `doubles.support` | `Support Dbl` | `D.c.7` |
| Support thru | `doubles.support.through` | `doubles.support_thru` | `thru_3` | `D.t.8` |
| Support redouble | `doubles.support.rdbl` | `doubles.support_rdbl` | `Redbl` | `D.c.9` |
| Takeout style | `doubles.takeout_style` | `doubles.to_style` | (no field) | `D.t.10` |
| Doubles notes (Other) | `doubles.notes` | `doubles.other` | `undefined_5` | `D.t.11` |
| Card-showing | `doubles.card_showing` | (n/a) | `Cardshowing` | (no field on New) |
| Min offshape T/O | `doubles.min_offshape_to` | (n/a) | `Min Offshape TO` | (no field on New) |

## Simple overcall

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 1-level range min | `overcalls.one_level_min` | `overcalls["1_lvl_min"]` | `SIMPLE OVERCALL` | `OC.t.1` |
| 1-level range max | `overcalls.one_level_max` | `overcalls["1_lvl_max"]` | `to_3` | `OC.t.2` |
| Often 4 cards | `overcalls.often_4_cards` | `overcalls.often_4_cards` | `often 4 cards` | `OC.c.3` |
| 2-level range min | `overcalls.two_level_min` | `overcalls["2_lvl_min"]` | (no field) | `OC.t.4` |
| 2-level range max | `overcalls.two_level_max` | `overcalls["2_lvl_max"]` | (no field) | `OC.t.5` |
| Jump overcalls = Weak | `overcalls.jump = 'weak'` | `overcalls.jump_wk` | `Weak_2` | `OC.c.6` |
| Jump overcalls = Intermediate | `overcalls.jump = 'intermediate'` | `overcalls.jump_int` | `Intermediate` | `OC.c.7` |
| Jump overcalls = Strong | `overcalls.jump = 'strong'` | `overcalls.jump_str` | `Strong` | `OC.c.8` |
| Overcalls Conv | (n/a) | (n/a) | (subsumed) | `OC.c.9` |
| Overcalls conv text | `overcalls.conv_text` | `overcalls.conv` | (no field) | `OC.t.10` |
| New suit response — Forcing | `overcalls.responses.new_suit = 'forcing'` | `overcalls.new_suit_f` | `New Suit Forcing` | `OC.c.11` |
| New suit — NF constructive | `overcalls.responses.new_suit = 'nf_constructive'` | `overcalls.new_suit_nf_const` | `NFConst` | `OC.c.12` |
| New suit — NF | `overcalls.responses.new_suit = 'nf'` | `overcalls.new_suit_nf` | `NF` | `OC.c.13` |
| New suit — Transfer | `overcalls.responses.new_suit = 'transfer'` | `overcalls.new_suit_tfr` | (no field) | `OC.c.14` |
| Jump raise — Weak | `overcalls.responses.jump_raise = 'weak'` | `overcalls.jump_raise_wk` | `Weak` | `OC.c.15` |
| Jump raise — Mixed | (n/a) | `overcalls.jump_raise_mixed` | (no field) | `OC.c.16` |
| Jump raise — Inv | `overcalls.responses.jump_raise = 'invitational'` | `overcalls.jump_raise_inv` | `Jump Raise Forcing` / `Inv` | `OC.c.17` |
| Cuebid responses (text) | `overcalls.responses.cuebids_text` | `overcalls.cuebids` | (no field) | `OC.t.18` |
| Support cuebid | `overcalls.responses.support_cuebid` | `overcalls.cue_support` | (no field) | `OC.c.19` |
| Overcalls notes (Other) | `overcalls.notes` | `overcalls.other` | `undefined_7` | `OC.t.20` |
| Very light style | `overcalls.very_light` | (derived) | `very light style` | (no field on New; subsumed in `OC.t.20`) |

## Jump overcall

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Jump overcall = Weak | `overcalls.jump = 'weak'` | `overcalls.jump_wk` | `Weak_2` | (combined with Overcalls — see `OC.c.6`) |
| Jump overcall = Intermediate | `overcalls.jump = 'intermediate'` | `overcalls.jump_int` | `Intermediate` | `OC.c.7` |
| Jump overcall = Strong | `overcalls.jump = 'strong'` | `overcalls.jump_str` | `Strong` | `OC.c.8` |

## Preempts

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 3-level style text | `preempts.three_level_style` | `preempts["3_lvl_style"]` | (subsumed) | `P.t.1` |
| 3-level style notes 2 | (n/a) | (n/a) | (no field) | `P.t.2` |
| 3-level response text | `preempts.three_level_response` | `preempts["3_lvl_response"]` | `ConvResp` | `P.t.3` |
| 4-level style text | `preempts.four_level_style` | `preempts["4_lvl_style"]` | (no field) | `P.t.4` |
| 4-level response text | `preempts.four_level_response` | `preempts["4_lvl_response"]` | (no field) | `P.t.5` |
| 4♣/4♦ transfer to major | `preempts.transfer_4_minor` | `preempts.transfer_4c4d` | (no field) | `P.c.6` |
| Preempts notes (Other) | `preempts.notes` | `preempts.other` | (no field) | `P.t.7` |
| 3-level style = Sound | `preempts.three_level_style = 'sound'` | (derived from text) | `Sound` | (no separate checkbox on New) |
| 3-level style = Light | `preempts.three_level_style = 'light'` | (derived) | `Light` | (no separate checkbox on New) |
| 3-level style = Very Light | `preempts.three_level_style = 'very_light'` | (derived) | `Very Light` | (no separate checkbox on New) |

## Direct cuebid (3×3 matrix)

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Michaels vs Art | `direct_cuebids.art_michaels` | `direct_cuebids.art_michaels` | `Michaels Artif Bids` | `DC.c.1` |
| Michaels vs Quasi | `direct_cuebids.quasi_michaels` | `direct_cuebids.quasi_michaels` | (no field) | `DC.c.2` |
| Michaels vs Nat minors | `direct_cuebids.nat_minors_michaels` | `direct_cuebids.nat_minors_michaels` | `Michaels Minor` | `DC.c.3` |
| Michaels vs Nat majors | `direct_cuebids.nat_majors_michaels` | `direct_cuebids.nat_majors_michaels` | `Michaels Major` | `DC.c.4` |
| Natural vs Art | `direct_cuebids.art_natural` | `direct_cuebids.art_natural` | `Natural Artif Bids` | `DC.c.5` |
| Natural vs Quasi | `direct_cuebids.quasi_natural` | `direct_cuebids.quasi_natural` | (no field) | `DC.c.6` |
| Natural vs Nat minors | `direct_cuebids.nat_minors_natural` | `direct_cuebids.nat_minors_natural` | `Natural Minor` | `DC.c.7` |
| Natural vs Nat majors | `direct_cuebids.nat_majors_natural` | `direct_cuebids.nat_majors_natural` | `Natural Major` | `DC.c.8` |
| Other vs Art | `direct_cuebids.art_other` | `direct_cuebids.art_other` | `Strong Artif Bids` | `DC.c.9` |
| Other vs Quasi | `direct_cuebids.quasi_other` | `direct_cuebids.quasi_other` | (no field) | `DC.c.10` |
| Other vs Nat minors | `direct_cuebids.nat_minors_other` | `direct_cuebids.nat_minors_other` | `Strong Minor` | `DC.c.11` |
| Other vs Nat majors | `direct_cuebids.nat_majors_other` | `direct_cuebids.nat_majors_other` | `Strong Major` | `DC.c.12` |
| Description | `direct_cuebids.description` | `direct_cuebids.describe` | `Michaels` | `DC.t.13` |

## Slam conventions

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Gerber — directly over NT | `other_conventions.gerber.directly_over_nt` | `slams.gerber_directly_over_nt` | (subsumed in `SLAM CONVENTIONS Gerber`) | `SL.c.1` |
| Gerber — over NT seq | `other_conventions.gerber.over_nt_seq` | `slams.gerber_over_nt_seq` | (subsumed) | `SL.c.2` |
| Gerber — non-NT seq | `other_conventions.gerber.non_nt_seq` | `slams.gerber_non_nt_seq` | (subsumed) | `SL.c.3` |
| Gerber umbrella + notes | `other_conventions.gerber.play` / `slam.notes` | (derived) | `SLAM CONVENTIONS   Gerber` | `SL.t.4` |
| 4NT Blackwood | `other_conventions.blackwood.standard` | `slams["4nt_blackwood"]` | `4NT Blackwood` | `SL.c.5` |
| RKC 0314 | `other_conventions.blackwood.rkcb_0314` | `slams["4nt_rkc_0314"]` | `RKC` | `SL.c.6` |
| RKC 1430 | `other_conventions.blackwood.rkcb_1430` | `slams["4nt_rkc_1430"]` | `1430` | `SL.c.7` |
| 4NT notes | `other_conventions.blackwood.notes` | `slams["4nt_more"]` | (no field) | `SL.t.8` |
| Control bids | `slam.control_bids` | `slams.control_bids` | `1_4` | `SL.t.9` |
| Vs interference | `slam.vs_interference` | `slams.vs_interference` | `2_4` | `SL.t.10` |
| Slam notes (Other) | `slam.notes` | `slams.other` | (no field) | `SL.t.11` |
| DOPI | `slam.dopi` | (in slams.other text) | `vs Interference DOPI` | (no separate field on New — in `SL.t.10` text) |
| DEPO | `slam.depo` | (in slams.other text) | `DEPO` | (no separate field on New) |
| ROPI | `slam.ropi` | (in slams.other text) | `ROPI` | (no separate field on New) |
| Trump-level cutover | `slam.trump_level` | `slams.trump_level` | `undefined_14` | (no separate field on New) |

## NT overcalls

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Direct 1NT range min | `nt_overcalls.direct.range_min` | `nt_overcalls.direct_1nt_min` | `NOTRUMP OVERCALLS` | `NTO.t.1` |
| Direct 1NT range max | `nt_overcalls.direct.range_max` | `nt_overcalls.direct_1nt_max` | `undefined` | `NTO.t.2` |
| Direct systems on | `nt_overcalls.direct.systems_on` | `nt_overcalls.direct_systems_on` | `Systems on` | `NTO.c.3` |
| Balance 1NT range min | `nt_overcalls.balance.range_min` | `nt_overcalls.balance_1nt_min` | `to_2` | `NTO.t.4` |
| Balance 1NT range max | `nt_overcalls.balance.range_max` | `nt_overcalls.balance_1nt_max` | `undefined_2` | `NTO.t.5` |
| Balance systems on | `nt_overcalls.balance.systems_on` | `nt_overcalls.balance_systems_on` | (no separate field) | `NTO.c.6` |
| Conv checkbox | (n/a) | (n/a) | `Conv` (in Conv text row) | `NTO.c.7` |
| Conv text | `nt_overcalls.direct.conv_text` | `nt_overcalls.conv` | (subsumed) | `NTO.t.8` |
| Jump 2NT = 2 lowest unbid | `nt_overcalls.jump_2nt_lowest_unbid` | `nt_overcalls.jump_2nt_2_lowest_unbid` | `Jump to 2NT 2 Lowest` | `NTO.c.9` |
| Jump 2NT = minors | `nt_overcalls.jump_2nt_minors` | (derived) | `Minors` | (no separate field on New) |
| NT overcalls notes (Other) | `nt_overcalls.notes` | `nt_overcalls.other` | `undefined_3` | `NTO.t.10` |

## Defense vs 1NT

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Vs strong NT — system | `competitive.vs_1nt_strong.system` | `vs_1nt_opening.vs_a` | `DEFENSE VS NOTRUMP` | `V1NT.t.1` |
| Vs weak NT — system | `competitive.vs_1nt_weak.system` | `vs_1nt_opening.vs_b` | `1` | `V1NT.t.2` |
| Vs strong — Dbl | `competitive.vs_1nt_strong.dbl` | `vs_1nt_opening.vs_a_dbl` | `Dbl` | `V1NT.t.3` |
| Vs weak — Dbl | `competitive.vs_1nt_weak.dbl` | `vs_1nt_opening.vs_b_dbl` | `6` | `V1NT.t.4` |
| Vs strong — 2♣ | `competitive.vs_1nt_strong.2c` | `vs_1nt_opening.vs_a_2c` | `2c_2` | `V1NT.t.5` |
| Vs weak — 2♣ | `competitive.vs_1nt_weak.2c` | `vs_1nt_opening.vs_b_2c` | `2` | `V1NT.t.6` |
| Vs strong — 2♦ | `competitive.vs_1nt_strong.2d` | `vs_1nt_opening.vs_a_2d` | `2d` | `V1NT.t.7` |
| Vs weak — 2♦ | `competitive.vs_1nt_weak.2d` | `vs_1nt_opening.vs_b_2d` | `3` | `V1NT.t.8` |
| Vs strong — 2♥ | `competitive.vs_1nt_strong.2h` | `vs_1nt_opening.vs_a_2h` | `2h` | `V1NT.t.9` |
| Vs weak — 2♥ | `competitive.vs_1nt_weak.2h` | `vs_1nt_opening.vs_b_2h` | `4` | `V1NT.t.10` |
| Vs strong — 2♠ | `competitive.vs_1nt_strong.2s` | `vs_1nt_opening.vs_a_2s` | `2s 1` | `V1NT.t.11` |
| Vs weak — 2♠ | `competitive.vs_1nt_weak.2s` | `vs_1nt_opening.vs_b_2s` | `5` | `V1NT.t.12` |
| Vs strong — 2NT | `competitive.vs_1nt_strong.2nt` | `vs_1nt_opening.vs_a_2nt` | (no field) | `V1NT.t.13` |
| Vs weak — 2NT | `competitive.vs_1nt_weak.2nt` | `vs_1nt_opening.vs_b_2nt` | (no field) | `V1NT.t.14` |
| Vs 1NT — Other | `competitive.vs_1nt_strong.other` | (n/a) | `2s 2` / `Other_2` | `V1NT.t.15` |

## Vs takeout double

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| New suit forcing 2-level | `vs_to_double.new_suit_forcing_2lvl` | `vs_to_double.new_suit_forcing_2_level` | `2 level` | `VTD.c.1` |
| New suit transfer responses | `vs_to_double.new_suit_forcing_tfr` | `vs_to_double.new_suit_forcing_trf` | `Transfer Resp` | `VTD.c.2` |
| New suit notes/text | (n/a) | (n/a) | (no field) | `VTD.t.3` |
| Jump shift = Weak | `vs_to_double.jump_shift = 'weak'` | `vs_to_double.jump_shift_weak` | `Weak_3` | `VTD.c.4` |
| Jump shift = Mixed | (n/a) | (n/a) | (no field) | `VTD.c.5` |
| Jump shift = Inv | `vs_to_double.jump_shift = 'inv'` | `vs_to_double.jump_shift_inv` | `Inv_2` | `VTD.c.6` |
| Jump shift = Fit / Forcing | `vs_to_double.jump_shift = 'fit'`/`'forcing'` | `vs_to_double.jump_shift_fit/_f` | `Fit` / `Jump Shift Forcing` | `VTD.c.7` |
| Redbl — 10+ | `vs_to_double.redouble.ten_plus` | `vs_to_double.redouble_10_plus` | (no field) | `VTD.c.8` |
| Redbl — Conv/Pen | `vs_to_double.redouble.conv` | (derived) | (no field) | `VTD.c.9` |
| Redbl — text | `vs_to_double.redouble.conv_desc` | `vs_to_double.redouble_conv_desc` | (no field) | `VTD.t.10` |
| Redbl — denies fit | `vs_to_double.redouble.denies_fit` | `vs_to_double.redouble_denies_fit` | `Redbl implies no fit` | (subsumed) |
| 2NT Over ♣/♦ — Nat | `vs_to_double.two_nt_raise_minors.nat` | (n/a) | (no field) | `VTD.c.11` |
| 2NT Over ♣/♦ — Raise | `vs_to_double.two_nt_raise_minors.play` | `["2nt_over_minors_raise"]` | `Minors Weak` etc. | `VTD.c.12` |
| 2NT Over ♣/♦ — Range min | `vs_to_double.two_nt_raise_minors.range_min` | `["2nt_over_minors_min"]` | (no field) | `VTD.t.13` |
| 2NT Over ♣/♦ — Range max | `vs_to_double.two_nt_raise_minors.range_max` | `["2nt_over_minors_max"]` | (no field) | `VTD.t.14` |
| 2NT Over ♥/♠ — Nat | `vs_to_double.two_nt_raise_majors.nat` | (n/a) | (no field) | `VTD.c.15` |
| 2NT Over ♥/♠ — Raise | `vs_to_double.two_nt_raise_majors.play` | `["2nt_over_majors_raise"]` | `Majors Weak` etc. | `VTD.c.16` |
| 2NT Over ♥/♠ — Range min | `vs_to_double.two_nt_raise_majors.range_min` | `["2nt_over_majors_min"]` | (no field) | `VTD.t.17` |
| 2NT Over ♥/♠ — Range max | `vs_to_double.two_nt_raise_majors.range_max` | `["2nt_over_majors_max"]` | (no field) | `VTD.t.18` |
| Notes (Other) | `vs_to_double.notes` | `vs_to_double.other` | `Minors_2` | `VTD.t.19` |
| New suit forcing 1-level | `vs_to_double.new_suit_forcing_1lvl` | (n/a) | `New Suit Forcing 1 level` | (no field on New) |
| 2NT Over Majors — Limit+/Limit/Weak | `vs_to_double.two_nt_raise_majors.{limit_plus,limit,weak}` | (n/a) | `Majors Limit+/Limit/Weak` | (subsumed in Raise/Nat above) |
| 2NT Over Minors — Limit+/Limit/Weak | `vs_to_double.two_nt_raise_minors.{...}` | (n/a) | `Minors Limit+/Limit/Weak` | (subsumed) |

## Vs preempts

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 2NT overcall text | `vs_preempts.two_nt_overcall` | `vs_preempts["2nt_overcall"]` | (no field) | `VP.t.1` |
| Takeout double thru | `vs_preempts.takeout_double_thru` | `vs_preempts.to_dbl_thru` | `VS Opening Pre` | `VP.t.2` |
| Takeout double penalty | `vs_preempts.takeout_double_penalty` | `vs_preempts.to_dbl_penalty` | `Penalty` | `VP.c.3` |
| Lebensohl 2NT response | `vs_preempts.lebensohl_response` | `vs_preempts["2nt_lebensohl_resp"]` | `Lebensohl  2NT  Response` | `VP.c.4` |
| Lebensohl text | (n/a) | (n/a) | (no field) | `VP.t.4` |
| Cuebid text | `vs_preempts.cuebid` | `vs_preempts.cuebid` | (no field) | `VP.t.5` |
| Jump overcalls text | `vs_preempts.jump_overcalls` | `vs_preempts.jump_overcalls` | (no field) | `VP.t.6` |
| Notes (Other) | `vs_preempts.notes` | `vs_preempts.other` | `Other_4` | `VP.t.7` |
| Takeout double (boolean) | `vs_preempts.takeout_double` | (derived) | `Takeout` | (subsumed in `VP.t.2` text) |
| Conv takeout text | `vs_preempts.conv_takeout` | (derived) | `thru_4` | (no separate field on New) |

## Defensive carding

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Standard attitude — vs suits | `carding.suits.standard_attitude` | `carding.suits_std_att` | `Standard vs Suits` | `C.c.1` |
| Standard attitude — vs NT | `carding.nt.standard_attitude` | `carding.nt_std_att` | `Standard vs NT` | `C.c.2` |
| Standard count — vs suits | `carding.suits.standard_count` | `carding.suits_std_count` | (subsumed) | `C.c.3` |
| Standard count — vs NT | `carding.nt.standard_count` | `carding.nt_std_count` | (subsumed) | `C.c.4` |
| UD attitude — vs suits | `carding.suits.upside_down_attitude` | `carding.suits_ud_att` | `attitude vs Suits` | `C.c.5` |
| UD attitude — vs NT | `carding.nt.upside_down_attitude` | `carding.nt_ud_att` | `attitude vs NT` | `C.c.6` |
| UD count — vs suits | `carding.suits.upside_down_count` | `carding.suits_ud_count` | `count vs Suits` | `C.c.7` |
| UD count — vs NT | `carding.nt.upside_down_count` | `carding.nt_ud_count` | `count vs NT` | `C.c.8` |
| Exceptions text | `carding.exceptions` | `carding.exceptions` | `Except 1` / `Except 2` | `C.t.9` |
| Other carding text | `carding.notes` | `carding.other` | (no field) | `C.t.10` |
| Smith echo — suits | `carding.smith_echo_suits` | `carding.smith_echo_suits` | `smith echo vs Suits` | `C.c.11` |
| Smith echo — NT | `carding.smith_echo_nt` | `carding.smith_echo_nt` | `smith echo vs NT` | `C.c.12` |
| Smith echo — reverse | `carding.smith_echo_reverse` | `carding.smith_echo_reverse` | (no field) | `C.c.13` |
| Smith echo text | (n/a) | (n/a) | (no field) | `C.t.14` |
| Trump signals | `carding.trump_signals` | `carding.trump_signals` | `Trump vs Suits` | `C.t.15` |
| Exceptions present (toggle) | `carding.exceptions_present` | (n/a) | `Except` | (no field on New) |
| Upside-down notes | `carding.upside_down_notes` | (n/a) | `Upside-down` | (no field on New) |

## First discard

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Standard | `carding.first_discard.standard` | `signals.first_discard_std` | (no field) | `SI.c.9` |
| Upside-down | `carding.first_discard.upside_down` | `signals.first_discard_ud` | (no field) | `SI.c.10` |
| Lavinthal | `carding.first_discard.lavinthal` | `signals.first_discard_lavinthal` | `Lavinthal vs Suits/NT` (mirrored) | `SI.c.11` |
| Odd/even | `carding.first_discard.odd_even` | `signals.first_discard_odd_even` | `odd/even vs Suits/NT` | `SI.c.12` |
| Other | (n/a) | (n/a) | `other vs Suits/NT` | `SI.c.13` |
| First discard text | (n/a) | (n/a) | `OddEven` (notes) | `SI.t.14` |
| Signals additional text | (n/a) | (n/a) | (no field) | `SI.t.15` |

## Other carding

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Smith echo / Trump signals / Foster echo | (see Carding section above) | (see Carding) | `smith echo` / `Trump vs Suits` / `foster echo` | (subsumed in `C.c.11–13` + `C.t.10`/`C.t.15`) |
| Special carding | `carding.special_carding` | (n/a) | `SPECIAL CARDING` | (no field on New) |

## Signals to partner

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| Primary signals notes | (n/a) | (n/a) | (no field) | `SI.t.1` |
| Declarer lead — Attitude | `carding.declarer_lead.attitude` | `signals.declarer_lead_att` | (no field) | `SI.c.2` |
| Partner lead — Attitude | `carding.partner_lead.attitude` | `signals.partner_lead_att` | `Attitude` | `SI.c.3` |
| Declarer lead — Count | `carding.declarer_lead.count` | `signals.declarer_lead_count` | (no field) | `SI.c.4` |
| Partner lead — Count | `carding.partner_lead.count` | `signals.partner_lead_count` | `Count` | `SI.c.5` |
| Declarer lead — Suit preference | `carding.declarer_lead.suit_preference` | `signals.declarer_lead_sp` | (no field) | `SI.c.6` |
| Partner lead — Suit preference | `carding.partner_lead.suit_preference` | `signals.partner_lead_sp` | `Suit preference` | `SI.c.7` |
| Signals exceptions | (n/a) | (n/a) | (no field) | `SI.t.8` |

## Leads

| Concept | `card_data` | Bridgeodex | ACBL Classic | ACBL New |
|---|---|---|---|---|
| 4th best — vs suits | `leads.vs_suits.length.fourth_best` | `leads_vs_suits.length_4th` | `vs SUITS` | `LS.c.1` |
| 3rd/5th — vs suits | `leads.vs_suits.length.third_fifth` | `leads_vs_suits.length_3_5` | `vs SUITS_2` | `LS.c.2` |
| 3rd/low — vs suits | `leads.vs_suits.length.third_low` | `leads_vs_suits.length_3_low` | (no field) | `LS.c.3` |
| Attitude — vs suits | `leads.vs_suits.length.attitude` | `leads_vs_suits.length_attitude` | (no field) | `LS.c.4` |
| Small from xx — vs suits | `leads.vs_suits.length.small_from_xx` | `leads_vs_suits.small_from_xx` | (no field) | `LS.c.5` |
| After 1st trick — vs suits | `leads.vs_suits.after_first_trick` | `leads_vs_suits.after_first_trick` | (no field) | `LS.t.6` |
| AKx(+) Varies — vs suits | (n/a) | `leads_vs_suits.honor_leads_akx_varies` | (no field) | `LS.c.7` |
| Honor leads text — vs suits | (n/a) | (n/a) | (no field) | `LS.t.8` |
| Exceptions — vs suits | `leads.vs_suits.exceptions` | `leads_vs_suits.exceptions` | (no field) | `LS.t.9` |
| 4th best — vs NT | `leads.vs_nt.length.fourth_best` | `leads_vs_nt.length_4th` | `vs NT` | `LN.c.1` |
| 3rd/5th — vs NT | `leads.vs_nt.length.third_fifth` | `leads_vs_nt.length_3_5` | `vs NT_2` | `LN.c.2` |
| 3rd/low — vs NT | `leads.vs_nt.length.third_low` | `leads_vs_nt.length_3_low` | (no field) | `LN.c.3` |
| Attitude — vs NT | `leads.vs_nt.length.attitude` | `leads_vs_nt.length_attitude` | `Attitude vs NT` | `LN.c.4` |
| 2nd from xxxx(+) — vs NT | `leads.vs_nt.length.second_from_4plus` | `leads_vs_nt.length_2nd_from_xxxx_plus` | (no field) | `LN.c.5` |
| After 1st trick — vs NT | `leads.vs_nt.after_first_trick` | `leads_vs_nt.after_first_trick` | (no field) | `LN.t.6` |
| AKxx(+) Varies — vs NT | (n/a) | `leads_vs_nt.honor_leads_akxx_varies` | (no field) | `LN.c.7` |
| Honor leads text — vs NT | (n/a) | (n/a) | (no field) | `LN.t.8` |
| Exceptions — vs NT | `leads.vs_nt.exceptions` | `leads_vs_nt.exceptions` | (no field) | `LN.t.9` |
| Attitude vs NT text | `leads.vs_nt.length.attitude_text` | (n/a) | `Attitude vs NT text` | (no field on New) |

## Open questions / gaps to resolve

- **ACBL New mapping is largely identified** but a few cells still
  carry approximate field numbers — most notably the 1NT alt-range
  (`1NT.t.*` numbers between primary and 3-level responses), the
  Smolen / Texas variants (`1NT.c.22`–`.c.24`), and the exact
  Same-Resp Y/N checkbox in the 1NT box. Re-run Shift+Alt+click Export
  in the editor to refresh the debug PDF when in doubt.
- **No FIELD_MAP for the New form exists yet** — only Classic is
  implemented in [src/utils/acblClassicFillPdf.js](../../src/utils/acblClassicFillPdf.js).
  Building a New-form FIELD_MAP is straightforward: walk this doc's
  ACBL New column, generate one entry per row.
- **ACBL New is much cleaner to fill** than Classic because each
  section has its own namespace (`1NT.c.N`, `OC.t.N`, …). No more
  guessing whether `Weak_3` is in the Major or Minor opening box.
- **Bridgeodex Mixed jump raises**: bridgeodex distinguishes
  Weak/Mixed/Inv jump raises. ACBL Classic only has Force/Inv/Weak;
  ACBL New keeps Weak/Mixed/Inv as `*.c.17–19` / `.c.20–22`, so the
  New form is a closer match.
- **First discard granularity**: bridgeodex stores a single boolean
  per discard convention. ACBL Classic has separate "vs SUITS" and
  "vs NT" columns; ACBL New collapses them into a single checkbox
  per convention (`SI.c.11` for Lavinthal, etc.) — so the New form
  is actually a better fit for bridgeodex data.
- **Suit glyphs in text fields**: pdf-lib's default Helvetica is
  WinAnsi-only and rejects ♣♦♥♠. We currently substitute the letter
  shorthand (C/D/H/S). Embedding a Unicode TTF would fix this for
  both Classic and New.
