import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getInboxMessages, getMessage, markMessageAsRead, EmailMessage, EmailMessageDetail } from '@/lib/api';
import { authService } from '@/lib/auth';
import { Inbox, RefreshCw, Paperclip, Star, Trash2, Archive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export const InboxPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getInboxMessages(50, 0);
      setMessages(response.messages);
      setTotalCount(response.totalCount);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
      if (err.message === 'Not authenticated') {
        navigate({ to: '/' } as any);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate({ to: '/' } as any);
      return;
    }

    loadMessages();
  }, [navigate]);

  const handleSelectMessage = async (message: EmailMessage) => {
    try {
      setLoadingMessage(true);
      const detail = await getMessage(message.id);
      setSelectedMessage(detail);

      // Mark as read if it wasn't already
      if (!message.isRead) {
        await markMessageAsRead(message.id, true);
        // Update local state
        setMessages(messages.map(m =>
          m.id === message.id ? { ...m, isRead: true } : m
        ));
      }
    } catch (err: any) {
      console.error('Error loading message:', err);
    } finally {
      setLoadingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Inbox className="h-6 w-6 text-[#0078D4]" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
                <p className="text-sm text-gray-600 mt-1">{totalCount} messages</p>
              </div>
            </div>
            <Button
              onClick={loadMessages}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
          <div className={`${selectedMessage ? 'w-1/3' : 'w-full'} border-r border-gray-200 bg-white overflow-y-auto transition-all`}>
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {loading && messages.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No messages in inbox</p>
              </div>
            ) : (
              <div>
                {messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-[#0078D4]' : ''
                    } ${!message.isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0078D4] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {getInitials(message.from.name, message.from.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm truncate ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {message.from.name || message.from.email}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {message.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(message.receivedDateTime)}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm mb-1 truncate ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {message.subject || '(No subject)'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {message.bodyPreview}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          {selectedMessage && (
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {selectedMessage.subject || '(No subject)'}
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {/* Message Header */}
                <div className="mb-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#0078D4] flex items-center justify-center text-white font-semibold">
                      {getInitials(selectedMessage.from.name, selectedMessage.from.email)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {selectedMessage.from.name || selectedMessage.from.email}
                      </p>
                      <p className="text-sm text-gray-500">{selectedMessage.from.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(selectedMessage.receivedDateTime).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      <span className="font-medium">To:</span>{' '}
                      {selectedMessage.toRecipients.map(r => r.email).join(', ')}
                    </p>
                    {selectedMessage.ccRecipients && selectedMessage.ccRecipients.length > 0 && (
                      <p className="mt-1">
                        <span className="font-medium">Cc:</span>{' '}
                        {selectedMessage.ccRecipients.map(r => r.email).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="prose max-w-none">
                  {selectedMessage.body.contentType === 'HTML' || selectedMessage.body.contentType === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedMessage.body.content }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{selectedMessage.body.content}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
