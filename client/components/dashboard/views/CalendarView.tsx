'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, PlusCircle, X, Trash2 } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

interface ICalendarEvent {
    id: number;
    title: string;
    date: Date;
    status: 'published' | 'scheduled' | 'draft';
    platform: string;
}

export function CalendarView(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Helper for generating deterministic mock data relative to current date
  const generateInitialEvents = (): ICalendarEvent[] => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    return [
        { id: 1, title: 'SEO Guide: Basics', date: new Date(y, m, 5, 10), status: 'published', platform: 'WordPress' },
        { id: 2, title: 'Social Recap', date: new Date(y, m, 12, 14), status: 'scheduled', platform: 'LinkedIn' },
        { id: 3, title: 'Product Update', date: new Date(y, m, 24, 16), status: 'draft', platform: 'Webflow' },
        { id: 4, title: 'AI Tools Comparison', date: new Date(y, m, 28, 9), status: 'scheduled', platform: 'WordPress' },
        { id: 5, title: 'Weekly Newsletter', date: new Date(y, m, 15, 11), status: 'published', platform: 'Mailchimp' },
    ];
  };

  const [events, setEvents] = useState<ICalendarEvent[]>(generateInitialEvents);
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ICalendarEvent | null>(null);
  const [modalFormData, setModalFormData] = useState<{title: string, date: string, status: string, platform: string}>({
      title: '', date: '', status: 'draft', platform: 'WordPress'
  });

  // Navigation
  const goToPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Drag Handlers
  const handleDragStart = (id: number) => setDraggedEventId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetDate: Date) => {
    if (draggedEventId) {
        setEvents(prev => prev.map(ev =>
            ev.id === draggedEventId
            ? { ...ev, date: new Date(targetDate.setHours(ev.date.getHours())) }
            : ev
        ));
        setDraggedEventId(null);
    }
  };

  // CRUD Handlers
  const openNewEventModal = (date: Date) => {
      setEditingEvent(null);
      const dateStr = date.toISOString().split('T')[0];
      setModalFormData({ title: '', date: dateStr, status: 'draft', platform: 'WordPress' });
      setIsModalOpen(true);
  };

  const openEditEventModal = (e: React.MouseEvent, event: ICalendarEvent) => {
      e.stopPropagation();
      setEditingEvent(event);
      const dateStr = event.date.toISOString().split('T')[0];
      setModalFormData({
          title: event.title,
          date: dateStr,
          status: event.status,
          platform: event.platform
      });
      setIsModalOpen(true);
  };

  const saveEvent = () => {
      const newDate = new Date(modalFormData.date);
      if (editingEvent) {
         newDate.setHours(editingEvent.date.getHours());
      } else {
         newDate.setHours(9);
      }

      if (editingEvent) {
          setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? {
              ...ev,
              title: modalFormData.title,
              date: newDate,
              status: modalFormData.status as ICalendarEvent['status'],
              platform: modalFormData.platform
          } : ev));
      } else {
          const newEvent: ICalendarEvent = {
              id: Date.now(),
              title: modalFormData.title,
              date: newDate,
              status: modalFormData.status as ICalendarEvent['status'],
              platform: modalFormData.platform
          };
          setEvents(prev => [...prev, newEvent]);
      }
      setIsModalOpen(false);
  };

  const deleteEvent = () => {
      if (editingEvent) {
          setEvents(prev => prev.filter(ev => ev.id !== editingEvent.id));
          setIsModalOpen(false);
      }
  };

  // Calendar Grid Generation
  const getDaysInMonth = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const days = [];
      const startPad = firstDay.getDay();

      // Previous month padding
      for (let i = startPad - 1; i >= 0; i--) {
          const d = new Date(year, month, -i);
          days.push({ date: d, isCurrentMonth: false });
      }

      // Current month
      for (let i = 1; i <= lastDay.getDate(); i++) {
          const d = new Date(year, month, i);
          days.push({ date: d, isCurrentMonth: true });
      }

      // Next month padding to fill 42 cells (6 rows)
      const endPad = 42 - days.length;
      for (let i = 1; i <= endPad; i++) {
          const d = new Date(year, month + 1, i);
          days.push({ date: d, isCurrentMonth: false });
      }

      return days;
  };

  const calendarGrid = getDaysInMonth();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
                 <h2 className="text-2xl font-bold text-white">{monthName}</h2>
                 <div className="flex bg-surface rounded-lg border border-border p-0.5">
                     <button onClick={goToPrevMonth} className="p-1.5 hover:bg-surface-light text-secondary hover:text-white rounded"><ChevronLeft className="w-4 h-4" /></button>
                     <button onClick={goToNextMonth} className="p-1.5 hover:bg-surface-light text-secondary hover:text-white rounded"><ChevronRight className="w-4 h-4" /></button>
                 </div>
                 <DashboardButton variant="outline" size="sm" onClick={goToToday} className="h-8">Today</DashboardButton>
             </div>

             <div className="flex gap-4">
                 <div className="flex items-center gap-4 text-xs text-secondary">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Published</div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Scheduled</div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted"></div> Draft</div>
                 </div>
                 <DashboardButton size="sm" onClick={() => openNewEventModal(new Date())}>
                     <Plus className="w-4 h-4 mr-2" /> Add Content
                 </DashboardButton>
             </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col overflow-hidden">
             {/* Days Header */}
             <div className="grid grid-cols-7 border-b border-border bg-main/50">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">{d}</div>
                  ))}
             </div>

             {/* Days Grid */}
             <div className="grid grid-cols-7 grid-rows-6 flex-1">
                 {calendarGrid.map((cell, i) => {
                     const isToday = new Date().toDateString() === cell.date.toDateString();
                     const dayEvents = events.filter(e =>
                         e.date.getDate() === cell.date.getDate() &&
                         e.date.getMonth() === cell.date.getMonth() &&
                         e.date.getFullYear() === cell.date.getFullYear()
                     );

                     return (
                         <div
                            key={i}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(cell.date)}
                            onClick={() => openNewEventModal(cell.date)}
                            className={`
                                min-h-[100px] border-b border-r border-border p-2 transition-colors relative group
                                ${!cell.isCurrentMonth ? 'bg-main/30 text-muted' : 'text-white hover:bg-surface-light/20'}
                                ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                            `}
                         >
                             <div className="flex justify-between items-start mb-1">
                                 <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : ''}`}>
                                     {cell.date.getDate()}
                                 </span>
                                 {/* Hover Add Icon */}
                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                     <PlusCircle className="w-4 h-4 text-accent/50 hover:text-accent cursor-pointer" />
                                 </div>
                             </div>

                             <div className="space-y-1.5">
                                 {dayEvents.map(ev => (
                                     <div
                                        key={ev.id}
                                        draggable
                                        onDragStart={() => handleDragStart(ev.id)}
                                        onClick={(e) => openEditEventModal(e, ev)}
                                        className={`
                                            text-[10px] p-1.5 rounded border cursor-pointer truncate shadow-sm hover:scale-[1.02] transition-all
                                            ${ev.status === 'published' ? 'bg-green-900/20 border-green-500/20 text-green-300' :
                                              ev.status === 'scheduled' ? 'bg-purple-900/20 border-purple-500/20 text-purple-300' :
                                              'bg-surface-light border-border text-secondary'}
                                        `}
                                     >
                                        <div className="font-medium truncate">{ev.title}</div>
                                        <div className="opacity-70 text-[9px] flex items-center gap-1">
                                            {ev.platform}
                                        </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="absolute top-4 right-4 text-muted hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-lg font-bold text-white mb-6">
                        {editingEvent ? 'Edit Content Task' : 'Schedule New Content'}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">Article Title</label>
                            <input
                                type="text"
                                value={modalFormData.title}
                                onChange={e => setModalFormData({...modalFormData, title: e.target.value})}
                                placeholder="e.g. The Future of AI SEO"
                                className="w-full bg-main border border-border rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-accent outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1.5">Date</label>
                                <input
                                    type="date"
                                    value={modalFormData.date}
                                    onChange={e => setModalFormData({...modalFormData, date: e.target.value})}
                                    className="w-full bg-main border border-border rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1.5">Platform</label>
                                <select
                                    value={modalFormData.platform}
                                    onChange={e => setModalFormData({...modalFormData, platform: e.target.value})}
                                    className="w-full bg-main border border-border rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-accent outline-none"
                                >
                                    <option value="WordPress">WordPress</option>
                                    <option value="Webflow">Webflow</option>
                                    <option value="Shopify">Shopify</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Medium">Medium</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['draft', 'scheduled', 'published'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setModalFormData({...modalFormData, status: s})}
                                        className={`capitalize py-2 rounded-lg text-xs font-medium border transition-colors ${
                                            modalFormData.status === s
                                            ? s === 'published' ? 'bg-green-500/20 border-green-500 text-green-400' : s === 'scheduled' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-surface-light border-border text-white'
                                            : 'bg-main border-border text-muted hover:border-border'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-8">
                        {editingEvent ? (
                            <button
                                onClick={deleteEvent}
                                className="text-red-400 hover:text-red-300 text-sm flex items-center"
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                            </button>
                        ) : <div></div>}

                        <div className="flex gap-3">
                            <DashboardButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</DashboardButton>
                            <DashboardButton size="sm" onClick={saveEvent}>Save Task</DashboardButton>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
