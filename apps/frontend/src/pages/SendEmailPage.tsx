import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authService } from '@/lib/auth';
import { sendEmail, EmailRecipient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export const SendEmailPage = () => {
  const navigate = useNavigate();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email form state
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState<'Text' | 'HTML'>('Text');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate({ to: '/' } as any);
    }
  }, [navigate]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailSuccess(false);

    // Parse recipients
    const recipientList = recipients
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (recipientList.length === 0) {
      setError('Please enter at least one recipient');
      return;
    }

    if (!subject || !body) {
      setError('Subject and body are required');
      return;
    }

    try {
      setSendingEmail(true);

      const emailRecipients: EmailRecipient[] = recipientList.map((email) => ({
        email,
      }));

      await sendEmail({
        to: emailRecipients,
        subject,
        body,
        contentType,
      });

      setEmailSuccess(true);
      // Clear form
      setRecipients('');
      setSubject('');
      setBody('');
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5">
            <h1 className="text-2xl font-semibold text-gray-900">Compose</h1>
            <p className="text-sm text-gray-600 mt-1">Create and send a new message</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Email Header */}
              <div className="bg-gradient-to-r from-[#0078D4] to-[#106EBE] px-6 py-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">New Message</h2>
              </div>

              {/* Form Container */}
              <div className="p-6">

                {emailSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                    <p className="text-green-800 font-medium">✓ Email sent successfully!</p>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-red-800 font-medium">✗ {error}</p>
                  </div>
                )}

                <form onSubmit={handleSendEmail} className="space-y-1">
                  {/* To Field */}
                  <div className="border-b border-gray-200 py-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-16">
                        To:
                      </label>
                      <input
                        type="text"
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                        placeholder="Enter email addresses separated by commas"
                        className="flex-1 px-2 py-1 border-0 focus:outline-none focus:ring-0 text-sm"
                      />
                    </div>
                  </div>

                  {/* Subject Field */}
                  <div className="border-b border-gray-200 py-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-16">
                        Subject:
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Add a subject"
                        className="flex-1 px-2 py-1 border-0 focus:outline-none focus:ring-0 text-sm"
                      />
                    </div>
                  </div>

                  {/* Content Type */}
                  <div className="border-b border-gray-200 py-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-16">
                        Format:
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value as 'Text' | 'HTML')}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4]"
                      >
                        <option value="Text">Plain Text</option>
                        <option value="HTML">HTML</option>
                      </select>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="pt-4">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={14}
                      className="w-full px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm resize-none"
                    />
                  </div>

                  {/* Send Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      type="submit"
                      disabled={sendingEmail}
                      className="bg-[#0078D4] hover:bg-[#106EBE] text-white px-6"
                    >
                      {sendingEmail ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
