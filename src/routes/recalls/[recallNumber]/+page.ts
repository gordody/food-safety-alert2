import type { PageLoad } from "./$types";
import { loadEnforcementAlertByRecallNumber, loadLatestEnforcementAlerts } from "$lib/api/enforcement";

export const load: PageLoad = async ({ params }) => {
  const apiKey = import.meta.env.PUBLIC_OPEN_FDA_API_KEY;
  const recallNumber = decodeURIComponent(params.recallNumber);
  const [alert, defaultAlerts] = await Promise.all([
    loadEnforcementAlertByRecallNumber(recallNumber, apiKey),
    loadLatestEnforcementAlerts(apiKey),
  ]);

  if (!alert) {
    return {
      alert: null,
      recallNumber,
      defaultAlerts,
    };
  }

  return {
    alert,
    recallNumber,
    defaultAlerts,
  };
};
