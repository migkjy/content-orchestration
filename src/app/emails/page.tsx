import Link from "next/link";
import { getAllEmails, SERVICE_BRANDS, SERVICES, SEQUENCES, type ServiceId } from "@/lib/email-data";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  approved: "승인됨",
  sent: "발송됨",
};

export default function EmailsPage() {
  const emails = getAllEmails();

  function getEmail(service: ServiceId, sequenceId: string) {
    return emails.find((e) => e.service === service && e.sequence === sequenceId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome 이메일 시퀀스</h1>
          <p className="mt-1 text-sm text-gray-500">
            4개 서비스 x 3개 시퀀스(D+0, D+3, D+7) = 12개 이메일 관리
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SERVICES.map((serviceId) => {
            const brand = SERVICE_BRANDS[serviceId];
            const serviceEmails = SEQUENCES.map((seq) => ({
              seq,
              email: getEmail(serviceId, seq.id),
            }));
            const approvedCount = serviceEmails.filter(
              (e) => e.email?.status === "approved" || e.email?.status === "sent",
            ).length;

            return (
              <div
                key={serviceId}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div
                  className="px-5 py-4 text-white"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{brand.name}</h2>
                      <p className="text-sm opacity-80">{brand.tagline}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs font-medium">
                        {approvedCount}/3 승인
                      </span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {serviceEmails.map(({ seq, email }) => (
                    <Link
                      key={seq.id}
                      href={`/emails/${serviceId}/${seq.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-gray-400 w-12 shrink-0">
                          {seq.label.split(" ")[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {email?.subject ?? "-"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {seq.label}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          STATUS_STYLES[email?.status ?? "draft"]
                        }`}
                      >
                        {STATUS_LABELS[email?.status ?? "draft"]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-2">전체 현황</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              총 {emails.length}개 |{" "}
              <span className="text-yellow-600 font-medium">
                초안 {emails.filter((e) => e.status === "draft").length}
              </span>{" "}
              |{" "}
              <span className="text-green-600 font-medium">
                승인 {emails.filter((e) => e.status === "approved").length}
              </span>{" "}
              |{" "}
              <span className="text-blue-600 font-medium">
                발송 {emails.filter((e) => e.status === "sent").length}
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
