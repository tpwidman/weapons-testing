## Data to Collect (one row per 10-round combat simulation)
#### Context

combat_id

weapon

advantage (true / false)

enemy_ac

enemy_size

rounds_simulated

#### Attacks & Hits

attacks_made

hits

misses

crit_hits

non_crit_hits

#### Damage (raw totals)

total_damage

weapon_damage

sneak_attack_damage

crit_bonus_damage

bleed_damage

#### Bleed System

bleed_counter_added

bleed_from_crits

bleed_from_non_crits

bleed_threshold

hemorrhages_triggered

bleed_overflow

#### Timing / Feel

rounds_to_first_crit

rounds_to_first_hemorrhage

## Metrics to Calculate (derived from the data)

#### Core

Mean / median / standard deviation of total_damage

Min / max damage

#### Crit-Focused

Crit rate = crit_hits / attacks_made

Damage per crit = crit_bonus_damage / crit_hits

Crit damage share = crit_bonus_damage / total_damage

Crit dependency ratio = (crit_bonus_damage + bleed_from_crits) / total_damage

#### Bleed-Focused

Average bleed per hit = bleed_counter_added / hits

Bleed per crit = bleed_from_crits / crit_hits

Bleed per non-crit = bleed_from_non_crits / non_crit_hits

Hemorrhages per combat = mean(hemorrhages_triggered)

Bleed damage share = bleed_damage / total_damage

Bleed efficiency = bleed_damage / bleed_counter_added

Bleed overflow ratio = bleed_overflow / bleed_counter_added

#### Timing / Reliability

Expected rounds to first hemorrhage = mean(rounds_to_first_hemorrhage)

% of combats with zero hemorrhages

Early hemorrhage rate (≤ round N)

#### Comparisons

Mean damage delta between weapons

% damage improvement

Win rate (% combats where one weapon outperforms another)

Advantage scaling factor = mean(with advantage) / mean(without advantage)