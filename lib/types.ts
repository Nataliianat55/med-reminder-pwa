export type Medication = {
  id: string;
  name: string;
  dosage: string;
  time: string; // "HH:MM"
  /**
   * 0..6 where 0=Mon, 6=Sun (local time).
   * Stored explicitly to avoid locale ambiguity.
   */
  daysOfWeek: number[];
  /**
   * Whether to play a local sound when this reminder fires while the app is open.
   */
  playSound?: boolean;
  createdAt: number;
};

