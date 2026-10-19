import { Firestore } from "@google-cloud/firestore";

export const firestore = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
