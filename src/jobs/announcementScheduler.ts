import cron from "node-cron";
import { recurringServices } from "../config/recurringServices.config.js";
import * as repo from "../modules/announcements/announcements.repository.js";

const SYSTEM_USER_ID = null; // announcements created by the system have no human author

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

async function postAnnouncement(title: string, message: string) {
  const announcement = await repo.createAnnouncement({
    title,
    message,
    priority: "Urgent",
    createdBy: SYSTEM_USER_ID as unknown as string,
    expiresAt: null,
  });
  await repo.publishAnnouncement(announcement.id);
}

export function startAnnouncementScheduler() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    for (const service of recurringServices) {
      if (isSameDayAndTime(service.dayOfWeek, service.time, 30, now)) {
        await postAnnouncement(`${service.name} — Starting Soon`, `${service.name} starts in 30 minutes.`);
      }
      if (isSameDayAndTime(service.dayOfWeek, service.time, 0, now)) {
        await postAnnouncement(`${service.name} — Started`, `${service.name} has started.`);
      }
    }
  });

  console.log("Announcement scheduler started");
}