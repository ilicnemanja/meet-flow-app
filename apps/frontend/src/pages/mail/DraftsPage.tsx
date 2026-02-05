import { DashboardLayout } from '@/components/DashboardLayout';
import { FileText } from 'lucide-react';

export const DraftsPage = () => {
  return (
    <DashboardLayout>
      <div className="h-full bg-[#FAF9F8]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 lg:px-8 py-5">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-[#0078D4]" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Drafts</h1>
                <p className="text-sm text-gray-600 mt-1">View your saved drafts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drafts Coming Soon
              </h3>
              <p className="text-gray-600">
                Draft messages will be available in a future update. Stay tuned!
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
