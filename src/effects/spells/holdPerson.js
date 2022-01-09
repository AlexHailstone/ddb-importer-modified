import { baseSpellEffect, generateStatusEffectChange } from "../specialSpells.js";

export function holdPersonEffect(document) {
  let effect = baseSpellEffect(document, document.name);
  effect.changes.push(generateStatusEffectChange("Paralyzed"));
  effect.changes.push({
    key: "flags.midi-qol.OverTime",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    value: `label=${document.name},turn=end,saveDC=@attributes.spelldc,saveAbility=wis,savingThrow=true,saveMagic=true`,
    priority: "20",
  });
  document.effects.push(effect);

  return document;
}
