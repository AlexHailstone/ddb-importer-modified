import PatreonHelper from "../lib/PatreonHelper.js";
import DDBMuncher from "../apps/DDBMuncher.js";
import { getCobalt } from "./Secrets.js";
import logger from "../logger.js";
import DDBProxy from "./DDBProxy.js";


export function getCampaignId() {
  const campaignId = game.settings.get("ddb-importer", "campaign-id").split("/").pop();

  if (campaignId && campaignId !== "" && !Number.isInteger(parseInt(campaignId))) {
    DDBMuncher.munchNote(`Campaign Id is invalid! Set to "${campaignId}", using empty string`, true);
    logger.error(`Campaign Id is invalid! Set to "${campaignId}", using empty string`);
    return "";
  } else if (campaignId.includes("join")) {
    DDBMuncher.munchNote(`Campaign URL is a join campaign link, using empty string! Set to "${campaignId}"`, true);
    logger.error(`Campaign URL is a join campaign link, using empty string! Set to "${campaignId}"`);
    return "";
  }
  return campaignId;
}

function getDDBCampaigns(cobalt = null) {
  const cobaltCookie = cobalt ? cobalt : getCobalt();
  const parsingApi = DDBProxy.getProxy();
  const betaKey = PatreonHelper.getPatreonKey();
  const body = { cobalt: cobaltCookie, betaKey: betaKey };

  return new Promise((resolve, reject) => {
    fetch(`${parsingApi}/proxy/campaigns`, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), // body data type must match "Content-Type" header
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          resolve(data.data);
        } else {
          logger.error(`Campaign fetch failed, got the following message: ${data.message}`, data);
          resolve([]);
        }
      })
      .catch((error) => {
        logger.error(`Cobalt cookie check error`);
        logger.error(error);
        logger.error(error.stack);
        reject(error);
      });
  });

}

export async function refreshCampaigns(cobalt = null) {
  if (cobalt) {
    CONFIG.DDBI.CAMPAIGNS = await getDDBCampaigns(cobalt);
  }
  return CONFIG.DDBI.CAMPAIGNS;
}

export async function getAvailableCampaigns() {
  if (CONFIG.DDBI.CAMPAIGNS) return CONFIG.DDBI.CAMPAIGNS;
  const campaignId = getCampaignId();
  // eslint-disable-next-line require-atomic-updates
  CONFIG.DDBI.CAMPAIGNS = await getDDBCampaigns();

  if (!CONFIG.DDBI.CAMPAIGNS) return [];

  CONFIG.DDBI.CAMPAIGNS.forEach((campaign) => {
    const selected = campaign.id == campaignId;
    campaign.selected = selected;
  });
  return CONFIG.DDBI.CAMPAIGNS;
}
