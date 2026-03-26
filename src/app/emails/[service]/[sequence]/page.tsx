"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface EmailData {
  service: string;
  sequence: string;
  delayDays: number;
  subject: string;
  bodyHtml: string;
  status: string;
  updatedAt: string;
}

export default function EmailDetailPage() {
  const params = useParams();
  const service = params.service as string;
  const sequence = params.sequence as string;

  const [email, setEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function fetchEmail() {
    setLoading(true);
    const res = await fetch(`/api/emails/${service}/${sequence}`);
    if (res.ok) {
      const data = await res.json();
      setEmail(data);
      setEditSubject(data.subject);
      setEditBody(data.bodyHtml);
      setDirty(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, sequence]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    const res = await fetch(`/api/emails/${service}/${sequence}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: editSubject, bodyHtml: editBody }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmail(data);
      setDirty(false);
      setSaveMessage("저장 완료");
      setTimeout(() => setSaveMessage(""), 2000);
    }
    setSaving(false);
  }

  async function handleApprove() {
    if (!confirm("이 이메일을 승인하시겠습니까?")) return;
    setApproving(true);
    const res = await fetch(`/api/emails/${service}/${sequence}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setEmail(data);
    }
    setApproving(false);
  }

  const sequenceLabels: Record<string, string> = {
    d0: "D+0 (즉시)",
    d3: "D+3 (3일 후)",
    d7: "D+7 (7일 후)",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">이메일을 찾을 수 없습니다.</p>
          <Link href="/emails" className="text-blue-600 text-sm hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/emails" className="text-sm text-gray-500 hover:text-blue-600">
              &larr; 목록
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold text-gray-800">
              {service} / {sequenceLabels[sequence] ?? sequence}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                email.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : email.status === "sent"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {email.status === "approved" ? "승인됨" : email.status === "sent" ? "발송됨" : "초안"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  previewMode === "desktop"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  previewMode === "mobile"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Mobile
              </button>
            </div>
            {saveMessage && (
              <span className="text-xs text-green-600 font-medium">{saveMessage}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {email.status === "draft" && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {approving ? "승인 중..." : "승인"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main: Preview + Editor side by side */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Preview */}
        <div className="flex-1 p-4 lg:p-6 flex flex-col items-center overflow-auto bg-gray-100">
          <div className="mb-3 text-xs text-gray-400 font-medium">
            미리보기 ({previewMode === "desktop" ? "데스크톱 600px" : "모바일 375px"})
          </div>
          <div
            className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300"
            style={{
              width: previewMode === "desktop" ? 640 : 395,
              maxWidth: "100%",
            }}
          >
            <iframe
              srcDoc={editBody}
              title="Email Preview"
              className="w-full border-0"
              style={{
                height: 700,
                pointerEvents: "none",
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Right: Editor */}
        <div className="w-full lg:w-[480px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 lg:p-6 overflow-auto">
          <h3 className="text-sm font-bold text-gray-700 mb-4">이메일 편집</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                제목 (Subject)
              </label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => {
                  setEditSubject(e.target.value);
                  setDirty(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                HTML 본문
              </label>
              <textarea
                value={editBody}
                onChange={(e) => {
                  setEditBody(e.target.value);
                  setDirty(true);
                }}
                rows={24}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                spellCheck={false}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">메타 정보</h4>
              <dl className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <dt>서비스</dt>
                  <dd className="font-medium text-gray-700">{email.service}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>시퀀스</dt>
                  <dd className="font-medium text-gray-700">{sequenceLabels[email.sequence] ?? email.sequence}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>발송 시점</dt>
                  <dd className="font-medium text-gray-700">구독 후 {email.delayDays}일</dd>
                </div>
                <div className="flex justify-between">
                  <dt>상태</dt>
                  <dd className="font-medium text-gray-700">{email.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>마지막 수정</dt>
                  <dd className="font-medium text-gray-700">
                    {new Date(email.updatedAt).toLocaleString("ko-KR")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Navigation to sibling sequences */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">같은 서비스 시퀀스</h4>
              <div className="flex gap-2">
                {["d0", "d3", "d7"].map((seq) => (
                  <Link
                    key={seq}
                    href={`/emails/${service}/${seq}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      seq === sequence
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {seq.toUpperCase().replace("D", "D+")}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
