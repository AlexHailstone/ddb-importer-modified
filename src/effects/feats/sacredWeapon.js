import { baseFeatEffect } from "../specialFeats.js";
import { loadMacroFile, generateMacroChange, generateItemMacroFlag } from "../macros.js";
import { generateATLChange } from "../effects.js";

export async function sacredWeaponEffect(document) {
  if (document.system.actionType === null) return document;
  let effect = baseFeatEffect(document, document.name);

  const itemMacroText = await loadMacroFile("feat", "sacredWeapon.js");
  document.flags["itemacro"] = generateItemMacroFlag(document, itemMacroText);
  effect.changes.push(generateMacroChange("@abilities.cha.mod", 0));

  // effect.changes.push(
  //   {
  //     key: "system.bonuses.weapon.attack",
  //     mode: CONST.ACTIVE_EFFECT_MODES.ADD,
  //     value: "+ @abilities.cha.mod",
  //     priority: "20",
  //   },
  // );

  if (CONFIG.DDBI.EFFECT_CONFIG.MODULES.installedModules.atlInstalled) {
    effect.changes.push(generateATLChange("ATL.light.dim", CONST.ACTIVE_EFFECT_MODES.UPGRADE, '5'));
    effect.changes.push(generateATLChange("ATL.light.color", CONST.ACTIVE_EFFECT_MODES.OVERRIDE, '#ffffff'));
    effect.changes.push(generateATLChange("ATL.light.alpha", CONST.ACTIVE_EFFECT_MODES.OVERRIDE, '0.25'));
    const lightAnimation = '{"type": "sunburst", "speed": 2,"intensity": 4}';
    effect.changes.push(generateATLChange("ATL.light.animation", CONST.ACTIVE_EFFECT_MODES.OVERRIDE, lightAnimation));
  }
  setProperty(effect, "flags.dae.selfTargetAlways", true);
  setProperty(effect, "duration.seconds", 60);
  document.effects.push(effect);
  return document;
}
