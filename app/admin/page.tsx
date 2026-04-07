"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getWorks, deleteWork } from "@/lib/storage";
import { WorkPost, CATEGORY_LABELS, CATEGORIES } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type InquiryStatus = "pending" | "received" | "completed" | "cancelled";

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  service: string;
  location: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

const STATUS_OPTIONS: InquiryStatus[] = ["pending", "received", "completed", "cancelled"];

const STATUS_LABEL: Record<InquiryStatus, string> = {
  pending: "신청",
  received: "접수",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_STYLE: Record<InquiryStatus, string> = {
  pending: "bg-blue-50 text-blue-600",
  received: "bg-amber-50 text-amber-600",
  completed: "bg-green-50 text-green-600",
  cancelled: "bg-steel-100 text-steel-400",
};

const WORKS_PAGE_SIZE = 10;
const INQUIRY_PAGE_SIZE = 10;

type Tab = "works" | "inquiries";

const today = new Date();

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("works");

  // 블로그 데이터 불러오기 팝업
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogDate, setBlogDate] = useState({ yyyy: today.getFullYear().toString(), mm: String(today.getMonth() + 1).padStart(2, "0"), dd: String(today.getDate()).padStart(2, "0") });
  const [blogLoading, setBlogLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blogModalOpen) return;
    const el = backdropRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      let node = e.target as HTMLElement | null;
      while (node && node !== el) {
        const { overflowY } = window.getComputedStyle(node);
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
          const atTop = node.scrollTop === 0 && e.deltaY < 0;
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight && e.deltaY > 0;
          if (!atTop && !atBottom) return;
        }
        node = node.parentElement;
      }
      e.preventDefault();
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [blogModalOpen]);
  const [blogResult, setBlogResult] = useState<{
    imported: number;
    total: number;
    results: { title: string; success: boolean; error?: string; _debug?: { htmlLen: number; method: string } }[];
    message?: string;
    source?: string;
    scrapeDebug?: {
      pages: { page: number; url: string; status: number; logNosFound: number; html200: boolean; htmlSnippet: string }[];
      posts: { logNo: string; title: string; pubDate: string; kstDate: string }[];
    };
  } | null>(null);

  // 시공사례
  const [allWorks, setAllWorks] = useState<WorkPost[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [worksVisible, setWorksVisible] = useState(WORKS_PAGE_SIZE);

  // 상담신청내역
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inquiryVisible, setInquiryVisible] = useState(INQUIRY_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");

  useEffect(() => {
    getWorks().then((data) => {
      setAllWorks(data);
      setWorksLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "inquiries" && inquiries.length === 0) {
      setInquiryLoading(true);
      supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setInquiries((data as Inquiry[]) ?? []);
          setInquiryLoading(false);
        });
    }
  }, [activeTab]);

  const filteredWorks = activeCategory === "all" ? allWorks : allWorks.filter((w) => w.category === activeCategory);

  const works = filteredWorks.slice(0, worksVisible);
  const hasMoreWorks = worksVisible < filteredWorks.length;

  const filteredInquiries = statusFilter === "all" ? inquiries : inquiries.filter((i) => i.status === statusFilter);

  const visibleInquiries = filteredInquiries.slice(0, inquiryVisible);
  const hasMoreInquiries = inquiryVisible < filteredInquiries.length;

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value);
    setWorksVisible(WORKS_PAGE_SIZE);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?`)) return;
    await deleteWork(id);
    setAllWorks(await getWorks());
  };

  const handleDeleteInquiry = async (id: string, name: string) => {
    if (!confirm(`"${name}"님의 상담신청을 삭제하시겠습니까?`)) return;
    await supabase.from("inquiries").delete().eq("id", id);
    setInquiries((prev) => prev.filter((i) => i.id !== id));
  };

  const handleStatusChange = async (id: string, status: InquiryStatus) => {
    await supabase.from("inquiries").update({ status }).eq("id", id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleInquiryFilterChange = (filter: InquiryStatus | "all") => {
    setStatusFilter(filter);
    setInquiryVisible(INQUIRY_PAGE_SIZE);
    setExpandedId(null);
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-steel-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-steel-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("works")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "works" ? "bg-white text-steel-900 shadow-sm" : "text-steel-500 hover:text-steel-700"}`}
          >
            시공사례 관리
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === "works" ? "bg-steel-100 text-steel-600" : "bg-steel-200 text-steel-500"}`}>{allWorks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "inquiries" ? "bg-white text-steel-900 shadow-sm" : "text-steel-500 hover:text-steel-700"}`}
          >
            상담신청내역
            {inquiries.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === "inquiries" ? "bg-steel-100 text-steel-600" : "bg-steel-200 text-steel-500"}`}>{inquiries.length}</span>
            )}
          </button>
        </div>

        {/* ── 시공사례 탭 ── */}
        {activeTab === "works" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-steel-900">시공사례 관리</h1>
                <p className="text-steel-500 text-sm">
                  전체 {allWorks.length}개{activeCategory !== "all" && ` · 현재 필터 ${filteredWorks.length}개`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBlogModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-steel-50 text-steel-700 font-semibold px-5 py-2.5 rounded-xl transition-colors border border-steel-200 hover:border-steel-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  블로그 데이터 불러오기
                </button>
                <Link href="/admin/new" className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  새 사례 등록
                </Link>
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map((cat) => {
                const count = cat.value === "all" ? allWorks.length : allWorks.filter((w) => w.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                      activeCategory === cat.value ? "bg-steel-900 text-white border-steel-900" : "bg-white text-steel-600 border-steel-200 hover:border-steel-400"
                    }`}
                  >
                    {cat.icon} {cat.label}
                    <span className={`text-xs px-1 py-0.5 sm:px-1.5 rounded-full ${activeCategory === cat.value ? "bg-white/20 text-white" : "bg-steel-100 text-steel-500"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {worksLoading ? (
              <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
                <p className="text-steel-400">불러오는 중...</p>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">🏗️</div>
                {allWorks.length === 0 ? (
                  <>
                    <p className="text-steel-500 font-medium mb-6">등록된 시공사례가 없습니다.</p>
                    <Link href="/admin/new" className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                      첫 번째 사례 등록하기
                    </Link>
                  </>
                ) : (
                  <p className="text-steel-500 font-medium">해당 카테고리의 시공사례가 없습니다.</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-steel-100 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-steel-50 border-b border-steel-100">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden sm:table-cell">썸네일</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600">제목</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden sm:table-cell">카테고리</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden md:table-cell">등록일</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-steel-600">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-100">
                      {works.map((work) => (
                        <tr key={work.id} className="hover:bg-steel-50 transition-colors">
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-steel-100 flex-shrink-0">
                              {work.thumbnail ? (
                                <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-steel-300 text-xl">🏗️</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-steel-800 text-sm line-clamp-2">{work.title}</p>
                            {work.summary && <p className="text-steel-400 text-xs mt-1 line-clamp-1">{work.summary}</p>}
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="inline-block bg-accent-50 text-accent-600 text-xs font-semibold px-2.5 py-1 rounded-full">{CATEGORY_LABELS[work.category]}</span>
                          </td>
                          <td className="px-6 py-4 text-steel-400 text-sm hidden md:table-cell">{new Date(work.createdAt).toLocaleDateString("ko-KR")}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/works/${work.id}`} className="p-2 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition-colors" title="미리보기">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </Link>
                              <Link href={`/admin/edit/${work.id}`} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Link>
                              <button onClick={() => handleDelete(work.id, work.title)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMoreWorks && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setWorksVisible((c) => c + WORKS_PAGE_SIZE)}
                      className="inline-flex items-center gap-2 bg-white hover:bg-steel-50 text-steel-700 font-semibold px-8 py-3 rounded-xl border border-steel-200 hover:border-steel-400 transition-all"
                    >
                      더보기
                      <span className="text-steel-400 text-sm">
                        ({works.length} / {filteredWorks.length})
                      </span>
                      <svg className="w-4 h-4 text-steel-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── 상담신청내역 탭 ── */}
        {activeTab === "inquiries" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-steel-900">상담신청내역</h1>
                <p className="text-steel-500 text-sm">
                  전체 {inquiries.length}건{statusFilter !== "all" && ` · ${STATUS_LABEL[statusFilter]} ${filteredInquiries.length}건`}
                </p>
              </div>
              <button
                onClick={() => {
                  setInquiryLoading(true);
                  setInquiryVisible(INQUIRY_PAGE_SIZE);
                  setStatusFilter("all");
                  setExpandedId(null);
                  supabase
                    .from("inquiries")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .then(({ data }) => {
                      setInquiries((data as Inquiry[]) ?? []);
                      setInquiryLoading(false);
                    });
                }}
                className="inline-flex items-center gap-2 bg-white hover:bg-steel-50 text-steel-700 font-semibold px-4 py-2.5 rounded-xl transition-colors border border-steel-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>

            {/* 상태 필터 */}
            {!inquiryLoading && inquiries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {(["all", ...STATUS_OPTIONS] as const).map((f) => {
                  const count = f === "all" ? inquiries.length : inquiries.filter((i) => i.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => handleInquiryFilterChange(f)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        statusFilter === f
                          ? f === "all"
                            ? "bg-steel-900 text-white border-steel-900"
                            : `${STATUS_STYLE[f]} border-transparent ring-2 ring-offset-1 ring-current`
                          : "bg-white text-steel-500 border-steel-200 hover:border-steel-400"
                      }`}
                    >
                      {f === "all" ? "전체" : STATUS_LABEL[f]}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === f ? (f === "all" ? "bg-white/20 text-white" : "bg-white/60") : "bg-steel-100 text-steel-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {inquiryLoading ? (
              <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
                <p className="text-steel-400">불러오는 중...</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-steel-500 font-medium">아직 상담신청이 없습니다.</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-steel-500 font-medium">{STATUS_LABEL[statusFilter as InquiryStatus]} 상태의 상담신청이 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {visibleInquiries.map((inq) => (
                    <div key={inq.id} className="bg-white rounded-2xl border border-steel-100 shadow-sm overflow-hidden">
                      {/* 요약 행 */}
                      <button onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)} className="w-full text-left px-6 py-4 hover:bg-steel-50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="inline-block bg-accent-50 text-accent-600 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{inq.service}</span>
                            <span className="font-semibold text-steel-800 text-sm">{inq.name}</span>
                            <span className="text-steel-500 text-sm">{inq.phone}</span>
                            {inq.location && <span className="text-steel-400 text-xs hidden md:block truncate">📍 {inq.location}</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[inq.status]}`}>{STATUS_LABEL[inq.status]}</span>
                            <span className="text-steel-400 text-xs hidden sm:block">
                              {new Date(inq.created_at).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                            <svg className={`w-4 h-4 text-steel-400 transition-transform ${expandedId === inq.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* 상세 내용 */}
                      {expandedId === inq.id && (
                        <div className="border-t border-steel-100 px-6 py-5 bg-steel-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-steel-400 font-medium">이름</span>
                              <p className="text-steel-800 mt-0.5">{inq.name}</p>
                            </div>
                            <div>
                              <span className="text-steel-400 font-medium">연락처</span>
                              <p className="text-steel-800 mt-0.5">
                                <a href={`tel:${inq.phone}`} className="text-accent-600 hover:underline">
                                  {inq.phone}
                                </a>
                              </p>
                            </div>
                            {inq.email && (
                              <div>
                                <span className="text-steel-400 font-medium">이메일</span>
                                <p className="text-steel-800 mt-0.5">
                                  <a href={`mailto:${inq.email}`} className="text-accent-600 hover:underline">
                                    {inq.email}
                                  </a>
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-steel-400 font-medium">문의 항목</span>
                              <p className="text-steel-800 mt-0.5">{inq.service}</p>
                            </div>
                            {inq.location && (
                              <div>
                                <span className="text-steel-400 font-medium">시공 장소</span>
                                <p className="text-steel-800 mt-0.5">{inq.location}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-steel-400 font-medium">신청일시</span>
                              <p className="text-steel-800 mt-0.5">{new Date(inq.created_at).toLocaleString("ko-KR")}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-steel-400 font-medium text-sm">문의 내용</span>
                            <p className="text-steel-800 text-sm mt-1 whitespace-pre-wrap bg-white rounded-xl p-4 border border-steel-100">{inq.message}</p>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <span className="text-steel-400 font-medium text-sm">상담 상태</span>
                              <div className="flex gap-1.5">
                                {STATUS_OPTIONS.map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(inq.id, s)}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${
                                      inq.status === s ? `${STATUS_STYLE[s]} border-transparent ring-2 ring-offset-1 ring-current` : "bg-white text-steel-400 border-steel-200 hover:border-steel-400"
                                    }`}
                                  >
                                    {STATUS_LABEL[s]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteInquiry(inq.id, inq.name)}
                              className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {hasMoreInquiries && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setInquiryVisible((c) => c + INQUIRY_PAGE_SIZE)}
                      className="inline-flex items-center gap-2 bg-white hover:bg-steel-50 text-steel-700 font-semibold px-8 py-3 rounded-xl border border-steel-200 hover:border-steel-400 transition-all"
                    >
                      더보기
                      <span className="text-steel-400 text-sm">
                        ({visibleInquiries.length} / {filteredInquiries.length})
                      </span>
                      <svg className="w-4 h-4 text-steel-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 블로그 데이터 불러오기 모달 */}
      {blogModalOpen && (
        <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] mx-4">
            <h2 className="text-lg font-extrabold text-steel-900 mb-1">블로그 데이터 불러오기</h2>

            {/* 결과 화면 */}
            {blogResult ? (
              <div className="mt-4">
                <p className="text-sm text-steel-600 mb-3">
                  총 <span className="font-bold text-steel-900">{blogResult.total}</span>개 중{" "}
                  <span className="font-bold text-green-600">{blogResult.imported}</span>개 등록 완료
                </p>

                {/* 포스트 결과 목록 */}
                {blogResult.results.length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto mb-3">
                    {blogResult.results.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${r.success ? "bg-green-50 text-green-700" : "bg-steel-50 text-steel-500"}`}
                      >
                        <span className="shrink-0 font-bold">{r.success ? "✓" : "–"}</span>
                        <span className="line-clamp-2 flex-1">{r.title}</span>
                        {r._debug && <span className="shrink-0 text-blue-400 font-mono">[{r._debug.method} {r._debug.htmlLen}B]</span>}
                        {r.error && <span className="shrink-0 text-steel-400">({r.error})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* 포스트를 찾지 못한 경우 사유 */}
                {blogResult.message && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800 space-y-2">
                    <p className="font-semibold">사유</p>
                    <p>{blogResult.message}</p>
                    {blogResult.scrapeDebug && (
                      <>
                        <p className="font-semibold pt-1">페이지 탐색 결과</p>
                        {blogResult.scrapeDebug.pages.map((p, i) => (
                          <div key={i} className="bg-white/60 rounded p-2 space-y-0.5">
                            <p>페이지 {p.page} · HTTP {p.status} · logNo {p.logNosFound}개 발견</p>
                            <p className="text-amber-600 font-mono break-all">{p.htmlSnippet}</p>
                          </div>
                        ))}
                        {blogResult.scrapeDebug.posts.length > 0 && (
                          <>
                            <p className="font-semibold pt-1">검사한 포스트</p>
                            <div className="max-h-32 overflow-y-auto overscroll-contain space-y-1">
                              {blogResult.scrapeDebug.posts.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="shrink-0 font-mono text-amber-500">{p.kstDate}</span>
                                  <span className="truncate">{p.title || p.logNo}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setBlogModalOpen(false);
                    setBlogResult(null);
                    if (blogResult.imported > 0) getWorks().then(setAllWorks);
                  }}
                  className="w-full py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <p className="text-steel-400 text-sm mb-6">불러올 날짜를 입력해주세요.</p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {/* 년도 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-steel-500 text-center">년도</label>
                    <div className="flex flex-col items-center border border-steel-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => ({ ...d, yyyy: String(Number(d.yyyy || today.getFullYear()) + 1) }))}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        maxLength={4}
                        value={blogDate.yyyy}
                        onChange={(e) => setBlogDate((d) => ({ ...d, yyyy: e.target.value.replace(/\D/g, "") }))}
                        className="w-full text-center text-steel-900 font-bold text-sm py-1.5 focus:outline-none border-y border-steel-100 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => ({ ...d, yyyy: String(Number(d.yyyy || today.getFullYear()) - 1) }))}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* 월 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-steel-500 text-center">월</label>
                    <div className="flex flex-col items-center border border-steel-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => { const v = Number(d.mm); return { ...d, mm: String(v >= 12 ? 1 : v + 1).padStart(2, "0") }; })}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        maxLength={2}
                        value={blogDate.mm}
                        onChange={(e) => setBlogDate((d) => ({ ...d, mm: e.target.value.replace(/\D/g, "") }))}
                        onBlur={(e) => {
                          const v = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                          setBlogDate((d) => ({ ...d, mm: String(v).padStart(2, "0") }));
                        }}
                        className="w-full text-center text-steel-900 font-bold text-sm py-1.5 focus:outline-none border-y border-steel-100 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => { const v = Number(d.mm); return { ...d, mm: String(v <= 1 ? 12 : v - 1).padStart(2, "0") }; })}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* 일 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-steel-500 text-center">일</label>
                    <div className="flex flex-col items-center border border-steel-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => { const v = Number(d.dd); return { ...d, dd: String(v >= 31 ? 1 : v + 1).padStart(2, "0") }; })}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        maxLength={2}
                        value={blogDate.dd}
                        onChange={(e) => setBlogDate((d) => ({ ...d, dd: e.target.value.replace(/\D/g, "") }))}
                        onBlur={(e) => {
                          const v = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                          setBlogDate((d) => ({ ...d, dd: String(v).padStart(2, "0") }));
                        }}
                        className="w-full text-center text-steel-900 font-bold text-sm py-1.5 focus:outline-none border-y border-steel-100 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setBlogDate((d) => { const v = Number(d.dd); return { ...d, dd: String(v <= 1 ? 31 : v - 1).padStart(2, "0") }; })}
                        className="w-full py-1.5 hover:bg-steel-50 transition-colors text-steel-400 hover:text-steel-700"
                      >
                        <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={blogLoading}
                    onClick={async () => {
                      const { yyyy, mm, dd } = blogDate;
                      if (!yyyy || !mm || !dd) {
                        alert("날짜를 모두 입력해주세요.");
                        return;
                      }
                      setBlogLoading(true);
                      try {
                        const date = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                        const res = await fetch("/api/blog-crawl", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ date }),
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error ?? "오류 발생");
                        setBlogResult({ imported: data.imported, total: data.total, results: data.results ?? [], message: data.message, source: data.source, scrapeDebug: data.scrapeDebug });
                      } catch (e) {
                        alert(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`);
                      } finally {
                        setBlogLoading(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-steel-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    {blogLoading && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {blogLoading ? "불러오는 중..." : "확인"}
                  </button>
                  <button
                    disabled={blogLoading}
                    onClick={() => setBlogModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-steel-200 text-steel-600 font-semibold text-sm hover:bg-steel-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
