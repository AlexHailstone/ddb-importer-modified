import DDBHelper from "../../lib/DDBHelper.js";
import DICTIONARY from "../../dictionary.js";
import DDBCharacter from "../DDBCharacter.js";
import logger from "../../logger.js";
import FileHelper from "../../lib/FileHelper.js";

// magicitems support
import { parseMagicItem } from "./magicify.js";

import { fixItems } from "./special.js";

// effects support
import { generateEffects } from "../../effects/effects.js";
import { generateBaseACItemEffect } from "../../effects/acEffects.js";
import { parseInfusion } from "./infusions.js";
import { addRestrictionFlags } from "../../effects/restrictions.js";
import { midiItemEffects } from "../../effects/specialEquipment.js";

// tables
import { generateTable } from "../../muncher/table.js";

// item collections
import { fixForItemCollections } from "./itemCollections.js";

// type: weapon
import parseWeapon from "./weapon.js";
import parseAmmunition from "./ammunition.js";
import parseStaff from "./staves.js";

// type: armor
import parseArmor from "./armor.js";

// tyoe: wonderous item
import parseWonderous from "./wonderous.js";

// type: consumables
import parsePotion from "./potion.js";
import parseScroll from "./scroll.js";

// type: tool
import parseTool from "./tool.js";

// other loot
import parseLoot from "./loot.js";
import parseCustomItem from "./custom.js";

import { getAttunement, getBaseItem } from "./common.js";


function getItemFromGearTypeIdOne(ddb, data) {
  let item = {};

  switch (data.definition.subType) {
    case "Potion":
      item = parsePotion(data, data.definition.subType);
      break;
    case "Tool":
      item = parseTool(ddb, data, data.definition.subType);
      break;
    case "Ammunition":
      item = parseAmmunition(data, data.definition.subType);
      break;
    default:
      item = parseLoot(data, data.definition.subType);
  }
  return item;
}

function otherGear(ddb, data) {
  let item = {};

  switch (data.definition.gearTypeId) {
    case 1:
      item = getItemFromGearTypeIdOne(ddb, data);
      break;
    case 4:
      item = parseLoot(data, "Mount");
      break;
    case 5:
      item = parsePotion(data, "Poison");
      break;
    case 6:
      item = parsePotion(data, "Potion");
      break;
    case 11:
      item = parseTool(ddb, data, "Tool");
      break;
    case 12:
    case 17:
    case 19:
      item = parseLoot(data, "Vehicle");
      break;
    case 16:
      item = parseLoot(data, "Equipment Pack");
      break;
    case 18:
      // Change to parseGemstone (consummable) ?
      item = parseLoot(data, "Gemstone");
      break;
    default:
      logger.warn("Other Gear type missing from " + data.definition.name, data);
  }
  return item;
}

function addExtraDDBFlags(data, item) {
  item.flags.ddbimporter['id'] = data.id;
  item.flags.ddbimporter['entityTypeId'] = data.entityTypeId;

  if (data.definition.avatarUrl) item.flags.ddbimporter.dndbeyond['avatarUrl'] = data.definition.avatarUrl.split('?')[0];
  if (data.definition.largeAvatarUrl) item.flags.ddbimporter.dndbeyond['largeAvatarUrl'] = data.definition.largeAvatarUrl.split('?')[0];
  if (data.definition.filterType) {
    const filter = DICTIONARY.items.find((i) => i.filterType === data.definition.filterType);
    if (filter) item.flags.ddbimporter.dndbeyond['filterType'] = filter.filterType;
  }

  // container info
  if (data.containerEntityId) setProperty(item, "flags.ddbimporter.containerEntityId", data.containerEntityId);
  if (data.containerEntityTypeId) setProperty(item, "flags.ddbimporter.containerEntityTypeId", data.containerEntityTypeId);

  setProperty(item, "flags.ddbimporter.dndbeyond.isConsumable", data.definition.isConsumable);
  setProperty(item, "flags.ddbimporter.dndbeyond.isContainer", data.definition.isContainer);
  setProperty(item, "flags.ddbimporter.dndbeyond.isCustomItem", data.definition.isCustomItem);
  setProperty(item, "flags.ddbimporter.dndbeyond.isHomebrew", data.definition.isHomebrew);
  setProperty(item, "flags.ddbimporter.dndbeyond.isMonkWeapon", data.definition.isMonkWeapon);
  setProperty(item, "flags.ddbimporter.dndbeyond.isPack", data.definition.isPack);
  setProperty(item, "flags.ddbimporter.dndbeyond.levelInfusionGranted", data.definition.levelInfusionGranted);

  return item;
}

function enrichFlags(data, item) {
  if (data.definition.magic) {
    setProperty(item, "system.properties.mgc", true);
  }
  if (data.definition?.entityTypeId) item.flags.ddbimporter['definitionEntityTypeId'] = data.definition.entityTypeId;
  if (data.definition?.id) item.flags.ddbimporter['definitionId'] = data.definition.id;
  if (data.entityTypeId) item.flags.ddbimporter['entityTypeId'] = data.entityTypeId;
  if (data.id) item.flags.ddbimporter['id'] = data.id;
  if (data.definition?.tags) item.flags.ddbimporter.dndbeyond['tags'] = data.definition.tags;
  if (data.definition?.sources) item.flags.ddbimporter.dndbeyond['sources'] = data.definition.sources;
  if (data.definition?.stackable) item.flags.ddbimporter.dndbeyond['stackable'] = data.definition.stackable;
}

// the filter type "Other Gear" represents the equipment while the other filters represents the magic items in ddb
export function parseItem(ddb, ddbItem, character, flags) {
  try {
    // is it a weapon?
    let item = {};
    if (ddbItem.definition.filterType) {
      switch (ddbItem.definition.filterType) {
        case "Weapon": {
          if (ddbItem.definition.type === "Ammunition" || ddbItem.definition.subType === "Ammunition") {
            item = parseAmmunition(ddbItem, "Ammunition");
          } else {
            item = parseWeapon(ddbItem, character, flags);
          }
          break;
        }
        case "Armor":
          item = parseArmor(ddbItem, character, flags);
          break;
        case "Wondrous item":
        case "Ring":
        case "Wand":
        case "Rod":
          item = parseWonderous(ddbItem);
          break;
        case "Staff":
          item = parseStaff(ddbItem, character);
          break;
        case "Potion":
          item = parsePotion(ddbItem, ddbItem.definition.type);
          break;
        case "Scroll":
          item = parseScroll(ddbItem);
          break;
        case "Other Gear":
          item = otherGear(ddb, ddbItem);
          break;
        default:
          logger.warn("Item filterType not implemented for " + ddbItem.definition.name, ddbItem);
          break;
      }
    } else {
      // try parsing it as a custom item
      item = parseCustomItem(ddbItem);
    }
    const baseItem = getBaseItem(ddbItem);
    setProperty(item, "system.baseItem", baseItem.baseItem);
    setProperty(item, "system.toolType", baseItem.toolType);
    item.system.attunement = getAttunement(ddbItem);
    if (ddbItem.definition.cost) item.system.price = ddbItem.definition.cost;

    item = addExtraDDBFlags(ddbItem, item);
    item = DDBHelper.addCustomValues(ddb, item);
    enrichFlags(ddbItem, item);

    return item;
  } catch (err) {
    logger.warn(
      `Unable to parse item: ${ddbItem.definition.name}, ${ddbItem.definition.type}/${ddbItem.definition.filterType}. ${err.message}`,
      ddbItem
    );
    logger.error(err.stack);
    return { // return empty strut
      name: ddbItem.definition.name,
      flags: {
        ddbimporter: {
          dndbeyond: {
          },
        },
      },
    };
  }
}


/**
 * We get extra damage to a weapon attack here, for example Improved
 * Divine Smite
 * @param {*} data
 * @param {*} restrictions (array)
 */
function getExtraDamage(ddb, restrictions) {
  return DDBHelper.filterBaseModifiers(ddb, "damage", null, restrictions).map((mod) => {
    const die = mod.dice ? mod.dice : mod.die ? mod.die : undefined;
    if (die) {
      return [die.diceString, mod.subType];
    } else if (mod.value) {
      return [mod.value, mod.subType];
    } else {
      return [null, null];
    }
  });
}

function isMartialArtists(classes) {
  return classes.some((cls) => cls.classFeatures.some((feature) => feature.definition.name === "Martial Arts"));
}

function getWarlockFeatures(ddb, weapon) {
  // Some features, notably hexblade abilities we scrape out here
  const warlockFeatures = ddb.character.characterValues
    .filter(
      (characterValue) =>
        characterValue.value
        && characterValue.valueId == weapon.id
        && DICTIONARY.character.characterValuesLookup.some(
          (entry) => entry.typeId == characterValue.typeId
        )
    )
    .map(
      (characterValue) =>
        DICTIONARY.character.characterValuesLookup.find(
          (entry) => entry.typeId == characterValue.typeId
        ).name
    );

  // Any Pact Weapon Features
  const pactFeatures = ddb.character.options.class
    .filter(
      (option) =>
        warlockFeatures.includes("pactWeapon")
        && option.definition.name
        && DICTIONARY.character.pactFeatures.includes(option.definition.name)
    )
    .map((option) => option.definition.name);

  const features = warlockFeatures.concat(pactFeatures);
  return features;
}

function getMonkFeatures(ddb, weapon) {
  const kenseiWeapon = DDBHelper.getChosenClassModifiers(ddb).some((mod) =>
    mod.friendlySubtypeName === weapon.definition.type
    && mod.type === "kensei"
  );

  const monkWeapon = DDBHelper.getChosenClassModifiers(ddb).some((mod) =>
    mod.friendlySubtypeName === weapon.definition.type
    && mod.type == "monk-weapon"
  ) || (weapon.definition.isMonkWeapon && isMartialArtists(ddb.character.classes));

  let features = [];

  if (kenseiWeapon) features.push("kenseiWeapon");
  if (monkWeapon) features.push("monkWeapon");

  return features;
}


function getMartialArtsDie(ddb) {
  let result = {
    diceCount: null,
    diceMultiplier: null,
    diceString: null,
    diceValue: null,
    fixedValue: null,
  };

  const die = ddb.character.classes
    // is a martial artist
    .filter((cls) => cls.classFeatures.some((feature) => feature.definition.name === "Martial Arts"))
    // get class features
    .map((cls) => cls.classFeatures)
    .flat()
    // filter relevant features, those that are martial arts and have a levelscaling hd
    .filter((feature) => feature.definition.name === "Martial Arts" && feature.levelScale && feature.levelScale.dice)
    // get this dice object
    .map((feature) => feature.levelScale.dice);

  if (die && die.length > 0) {
    result = die[0];
  }

  return result;

}

function getClassFeatures(ddb, weapon) {
  const warlockFeatures = getWarlockFeatures(ddb, weapon);
  const monkFeatures = getMonkFeatures(ddb, weapon);
  return warlockFeatures.concat(monkFeatures);
}

function getItemFlags(ddbCharacter, ddbItem) {
  const ddb = ddbCharacter.source.ddb;
  const character = ddbCharacter.raw.character;
  let flags = {
    damage: {
      parts: [],
    },
    // Some features, notably hexblade abilities we scrape out here
    classFeatures: getClassFeatures(ddb, ddbItem),
    martialArtsDie: getMartialArtsDie(ddb),
    maxMediumArmorDex: Math.max(...DDBHelper.filterBaseModifiers(ddb, "set", "ac-max-dex-armored-modifier").map((mod) => mod.value), 2),
    magicItemAttackInt: DDBHelper.filterBaseModifiers(ddb, "bonus", "magic-item-attack-with-intelligence").length > 0,
  };

  if (flags.classFeatures.includes("Lifedrinker")) {
    flags.damage.parts.push(["@mod", "necrotic"]);
  }
  // const addItemEffects = game.settings.get("ddb-importer", "character-update-policy-add-item-effects");
  const addCharacterEffects = game.settings.get("ddb-importer", "character-update-policy-add-character-effects");

  // for melee attacks get extras
  if (ddbItem.definition.attackType === 1) {
    // get improved divine smite etc for melee attacks
    const extraDamage = getExtraDamage(ddb, ["Melee Weapon Attacks"]);

    if (!!extraDamage.length > 0) {
      flags.damage.parts = flags.damage.parts.concat(extraDamage);
    }
    // do we have great weapon fighting?
    if (DDBHelper.hasChosenCharacterOption(ddb, "Great Weapon Fighting")) {
      flags.classFeatures.push("greatWeaponFighting");
    }
    // do we have dueling fighting style?
    if (DDBHelper.hasChosenCharacterOption(ddb, "Dueling") && !addCharacterEffects) {
      flags.classFeatures.push("Dueling");
    }
    // do we have two weapon fighting style?
    if (DDBHelper.hasChosenCharacterOption(ddb, "Two-Weapon Fighting")) {
      flags.classFeatures.push("Two-Weapon Fighting");
    }
    if (DDBHelper.getCustomValueFromCharacter(ddbItem, character, 18)) {
      flags.classFeatures.push("OffHand");
    }
  }
  // ranged fighting style is added as a global modifier elsewhere
  // as is defensive style

  return flags;
}

async function getIcon(item, ddbItem) {
  if (ddbItem.definition?.avatarUrl || ddbItem.definition?.largeAvatarUrl) {
    const url = ddbItem.definition?.avatarUrl ?? ddbItem.definition?.largeAvatarUrl;
    const downloadOptions = { type: "item", name: `custom-${item.name}`, download: true };
    const img = await FileHelper.getImagePath(url, downloadOptions);
    if (img) {
      // eslint-disable-next-line require-atomic-updates
      item.img = img;
      setProperty(item, "flags.ddbimporter.keepIcon", false);
    }
  }
  return item;
}


// TO DO: revisit to break up item parsing
DDBCharacter.prototype.getInventory = async function getInventory() {

  let items = [];
  // first, check custom name, price or weight
  this.source.ddb.character.characterValues.forEach((cv) => {
    // try to find a matching item based on the characterValues (an array of custom adjustements to different parts of the character)
    let item = this.source.ddb.character.inventory.find((item) => item.id === cv.valueId);
    if (item) {
      // check if this property is in the list of supported ones, based on our DICT
      let property = DICTIONARY.item.characterValues.find((entry) => entry.typeId === cv.typeId);
      // overwrite the name, weight or price with the custom value
      if (property && cv.value.length !== 0) item.definition[property.value] = cv.value;
    }
  });

  // now parse all items
  const daeInstalled = game.modules.get("dae")?.active;
  const compendiumItem = this.raw.character.flags.ddbimporter.compendium;
  const addEffects = (compendiumItem)
    ? game.settings.get("ddb-importer", "munching-policy-add-effects")
    : game.settings.get("ddb-importer", "character-update-policy-add-item-effects");
  const generateArmorACEffect = (compendiumItem)
    ? game.settings.get("ddb-importer", "munching-policy-add-ac-armor-effects")
    : false;

  for (let ddbItem of this.source.ddb.character.inventory) {
    const originalName = ddbItem.definition.name;
    ddbItem.definition.name = DDBHelper.getName(this.source.ddb, ddbItem, this.raw.character);
    const flags = getItemFlags(this, ddbItem);

    const updateExisting = compendiumItem
      ? game.settings.get("ddb-importer", "munching-policy-update-existing")
      : false;
    ddbItem.definition.description = generateTable(ddbItem.definition.name, ddbItem.definition.description, updateExisting);

    let item = Object.assign({}, parseItem(this.source.ddb, ddbItem, this.raw.character, flags));

    if (item) {
      item = parseMagicItem(item, ddbItem, this.raw.itemSpells);
      item.flags.ddbimporter.originalName = originalName;
      item.flags.ddbimporter.version = CONFIG.DDBI.version;
      if (!item.effects) item.effects = [];
      if (!item.name || item.name === "") item.name = "Item";

      if (daeInstalled && addEffects) item = generateEffects(this.source.ddb, this.raw.character, ddbItem, item, compendiumItem, "item");
      // if this is a piece of armor and not generating effects don't generate ac
      if (item.type === "equipment" && item.system.armor?.type && !["trinket", "clothing"].includes(item.system.armor.type)) {
        if (daeInstalled && generateArmorACEffect) {
          item = generateBaseACItemEffect(this.source.ddb, this.raw.character, ddbItem, item, compendiumItem);
        }
      } else {
        // always generate other item ac effects
        item = generateBaseACItemEffect(this.source.ddb, this.raw.character, ddbItem, item, compendiumItem);
      }

      // eslint-disable-next-line no-await-in-loop
      if (addEffects) item = await addRestrictionFlags(item);

      if (!compendiumItem) item = parseInfusion(this.source.ddb, this.raw.character, item, ddbItem, compendiumItem);
      // eslint-disable-next-line no-await-in-loop
      item = await midiItemEffects(item);
      // eslint-disable-next-line no-await-in-loop
      // item = await getIcon(item, ddbItem);

      items.push(item);
    }
  }

  fixItems(items);
  items = fixForItemCollections(this.source.ddb, items);
  return items;
};
