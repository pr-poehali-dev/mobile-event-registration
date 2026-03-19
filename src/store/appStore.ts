import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Participant {
  name: string;
}

export interface Slot {
  slotNumber: number;
  participants: Participant[];
  isReserve: boolean;
}

export interface Team {
  id: string;
  teamName: string;
  tgContact: string;
  eventId: string;
  slots: Slot[];
  registeredAt: string;
  editToken: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  map: string;
  password: string;
  isOpen: boolean;
  createdAt: string;
}

interface AppState {
  events: Event[];
  teams: Team[];
  adminPassword: string;
  addEvent: (event: Omit<Event, "id" | "createdAt">) => void;
  toggleEventRegistration: (eventId: string) => void;
  deleteEvent: (eventId: string) => void;
  addTeam: (team: Omit<Team, "id" | "registeredAt" | "editToken">) => string;
  updateTeamSlots: (teamId: string, token: string, slots: Slot[]) => boolean;
  deleteTeam: (teamId: string, token: string) => boolean;
  getTeamsByEvent: (eventId: string) => Team[];
  getNextSlotNumbers: (eventId: string, count: number) => number[];
}

const generateId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const generateToken = () => Math.random().toString(36).slice(2, 18);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      adminPassword: "admin123",
      events: [
        {
          id: "demo1",
          title: "Турнир по CS2 — Весна 2026",
          date: "2026-04-15",
          time: "18:00",
          map: "Mirage",
          password: "spring2026",
          isOpen: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "demo2",
          title: "Открытый чемпионат — Лига А",
          date: "2026-05-01",
          time: "20:00",
          map: "Inferno",
          password: "liga2026",
          isOpen: true,
          createdAt: new Date().toISOString(),
        },
      ],
      teams: [],

      addEvent: (event) =>
        set((state) => ({
          events: [
            ...state.events,
            { ...event, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      toggleEventRegistration: (eventId) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, isOpen: !e.isOpen } : e
          ),
        })),

      deleteEvent: (eventId) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
          teams: state.teams.filter((t) => t.eventId !== eventId),
        })),

      addTeam: (team) => {
        const token = generateToken();
        set((state) => ({
          teams: [
            ...state.teams,
            {
              ...team,
              id: generateId(),
              registeredAt: new Date().toISOString(),
              editToken: token,
            },
          ],
        }));
        return token;
      },

      updateTeamSlots: (teamId, token, slots) => {
        const team = get().teams.find((t) => t.id === teamId);
        if (!team || team.editToken !== token) return false;
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId ? { ...t, slots } : t
          ),
        }));
        return true;
      },

      deleteTeam: (teamId, token) => {
        const team = get().teams.find((t) => t.id === teamId);
        if (!team || team.editToken !== token) return false;
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== teamId),
        }));
        return true;
      },

      getTeamsByEvent: (eventId) =>
        get().teams.filter((t) => t.eventId === eventId),

      getNextSlotNumbers: (eventId, count) => {
        const teams = get().teams.filter((t) => t.eventId === eventId);
        const usedSlots = teams.flatMap((t) =>
          t.slots.filter((s) => !s.isReserve).map((s) => s.slotNumber)
        );
        const numbers: number[] = [];
        let next = 1;
        while (numbers.length < count) {
          if (!usedSlots.includes(next)) numbers.push(next);
          next++;
        }
        return numbers;
      },
    }),
    { name: "slotreg-storage" }
  )
);
