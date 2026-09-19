import cron from "node-cron";
import { recurringServices } from "../config/recurringServices.config.js";
import * as service from "../modules/announcements/announcements.service.js";
import { logSystemEvent } from "../utils/systemEventLogger.js";

function isSameDayAndTime(dayOfWeek: number, time: string, offsetMinutes: number, now: Date) {
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  const [h, m] = time.split(":").map(Number);
  target.setHours(h, m, 0, 0);
  target.setMinutes(target.getMinutes() - offsetMinutes);

  return (
    now.getDay() === dayOfWeek &&
    now.getHours() === target.getHours() &&
    now.getMinutes() === target.getMinutes()
  );
}

export let lastSchedulerRunAt: Date | null = null;

async function postAnnouncement(title: string, message: string) {
  await service.createAnnouncement(
    { title, message, priority: "Urgent", isUrgent: true },
    null as unknown as string
  );
  await logSystemEvent({
    component: "Sync Worker",
    severity: "Success",
    event: "Scheduled announcement posted",
    message: title,
  });
}

export function startAnnouncementScheduler() {
  cron.schedule("* * * * *", async () => {
    lastSchedulerRunAt = new Date();
    const now = new Date();

    for (const svc of recurringServices) {
      if (isSameDayAndTime(svc.dayOfWeek, svc.time, 30, now)) {
        await postAnnouncement(`${svc.name} — Starting Soon`, `${svc.name} starts in 30 minutes.`);
      }
      if (isSameDayAndTime(svc.dayOfWeek, svc.time, 0, now)) {
        await postAnnouncement(`${svc.name} — Started`, `${svc.name} has started.`);
      }
    }
  });

  console.log("Announcement scheduler started");
}