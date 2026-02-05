import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { authService } from "@/lib/auth";
import {
  getCalendarEvents,
  createCalendarEvent,
  CalendarEvent,
  CreateEventRequest,
} from "@/lib/api";
import { CreateEventModal } from "@/components/CreateEventModal";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Radio } from "lucide-react";
import { useCalendarWebSocket } from "@/hooks/useCalendarWebSocket";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEventWithDates extends CalendarEvent {
  start: Date;
  end: Date;
  title: string;
}

export const CalendarPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEventWithDates[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Handle real-time calendar updates from WebSocket
  const handleCalendarUpdate = useCallback((update: any) => {
    console.log('[CalendarPage] Received calendar update:', update);

    if (update.deleted) {
      // Remove deleted event
      setEvents((prevEvents) => prevEvents.filter((e) => e.id !== update.id));
    } else if (update.changeType === 'created') {
      // Add new event
      const newEvent: CalendarEventWithDates = {
        ...update,
        start: new Date(update.startDateTime),
        end: new Date(update.endDateTime),
        title: update.subject,
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    } else if (update.changeType === 'updated') {
      // Update existing event
      setEvents((prevEvents) =>
        prevEvents.map((e) =>
          e.id === update.id
            ? {
                ...update,
                start: new Date(update.startDateTime),
                end: new Date(update.endDateTime),
                title: update.subject,
              }
            : e
        )
      );
    }
  }, []);

  // Setup WebSocket connection for real-time updates
  const { isConnected, subscriptionStatus } = useCalendarWebSocket({
    onUpdate: handleCalendarUpdate,
    autoSubscribe: true,
  });

  // Debug logging
  useEffect(() => {
    console.log('[CalendarPage] WebSocket status - isConnected:', isConnected, 'subscriptionStatus:', subscriptionStatus);
  }, [isConnected, subscriptionStatus]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on current view
      const startDate = new Date(currentDate);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);

      const calendarEvents = await getCalendarEvents(
        startDate.toISOString(),
        endDate.toISOString()
      );

      const formattedEvents: CalendarEventWithDates[] = calendarEvents.map(
        (event) => ({
          ...event,
          start: new Date(event.startDateTime),
          end: new Date(event.endDateTime),
          title: event.subject,
        })
      );

      setEvents(formattedEvents);
    } catch (err: any) {
      console.error("Error loading events:", err);
      setError(err.message || "Failed to load calendar events");
      if (err.message === "Not authenticated") {
        navigate({ to: "/" } as any);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate, navigate]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate({ to: "/" } as any);
      return;
    }

    loadEvents();
  }, [loadEvents, navigate]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEventWithDates) => {
    // You can implement event details view here
    alert(`Event: ${event.title}\nTime: ${format(event.start, "PPpp")}`);
  };

  const handleCreateEvent = async (eventData: CreateEventRequest) => {
    await createCalendarEvent(eventData);
    await loadEvents();
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setCurrentView(newView);
  };

  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
                {isConnected && subscriptionStatus.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{format(currentDate, "MMMM yyyy")}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadEvents}
                variant="outline"
                disabled={loading}
                className="flex items-center gap-2 border-gray-300 hover:border-[#0078D4] hover:text-[#0078D4]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] text-white"
              >
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-8 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">

          {loading && events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading calendar...</p>
            </div>
          ) : (
            <div style={{ height: "600px" }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                view={currentView}
                selectable
                popup
                style={{ height: "100%" }}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.isCancelled ? "#9ca3af" : "#3b82f6",
                    borderRadius: "4px",
                    opacity: event.isCancelled ? 0.6 : 1,
                    color: "white",
                    border: "none",
                    display: "block",
                  },
                })}
              />
            </div>
          )}
        </div>

        <CreateEventModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateEvent}
          selectedDate={selectedDate}
        />
      </div>
      </div>
    </DashboardLayout>
  );
};
