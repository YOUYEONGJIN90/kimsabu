'use client';

import { useState } from 'react';

const SERVICES = ['휀스', '난간', '대문', '데크', '금속구조물', '기타'];

interface FormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  location: string;
  message: string;
  agree: boolean;
}

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  location: string;
  message: string;
  createdAt: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    service: '',
    location: '',
    message: '',
    agree: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요';
    if (!form.phone.trim()) newErrors.phone = '연락처를 입력해주세요';
    else if (!/^[0-9-+\s]{9,13}$/.test(form.phone.replace(/\s/g, '')))
      newErrors.phone = '올바른 연락처를 입력해주세요';
    if (!form.service) newErrors.service = '서비스를 선택해주세요';
    if (!form.message.trim()) newErrors.message = '문의 내용을 입력해주세요';
    if (!form.agree) newErrors.agree = '개인정보 수집에 동의해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const inquiry: Inquiry = {
      id: Date.now().toString(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      service: form.service,
      location: form.location,
      message: form.message,
      createdAt: new Date().toISOString(),
    };

    const key = 'kimsabu_inquiries';
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as Inquiry[];
    existing.unshift(inquiry);
    localStorage.setItem(key, JSON.stringify(existing));

    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  if (submitted) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
            ✅
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-steel-900 mb-4">
            문의가 접수되었습니다!
          </h2>
          <p className="text-steel-500 leading-relaxed mb-8">
            소중한 문의 감사합니다.
            <br />
            빠른 시일 내에 연락드리겠습니다.
            <br />
            <strong className="text-steel-700">평일 08:00 ~ 18:00</strong> 내 답변드립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ name: '', phone: '', email: '', service: '', location: '', message: '', agree: false });
              }}
              className="bg-steel-100 hover:bg-steel-200 text-steel-700 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              추가 문의하기
            </button>
            <a
              href="/"
              className="bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-center"
            >
              홈으로 가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-20">
      {/* 헤더 */}
      <div className="bg-steel-900 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">무료 견적 문의</h1>
          <p className="text-steel-400 text-lg">
            무료 현장 방문 견적을 신청하세요. 빠르게 연락드립니다.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* 연락처 정보 */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-steel-800 mb-4">연락처 안내</h2>
              <div className="space-y-4">
                {[
                  { icon: '📞', title: '전화', content: '010-0000-0000', sub: '평일 08:00 ~ 18:00' },
                  { icon: '📍', title: '주소', content: '경기도 OO시 OO구 OO동', sub: '' },
                  { icon: '✉️', title: '이메일', content: 'kimsabu@email.com', sub: '' },
                  { icon: '⏰', title: '운영시간', content: '평일 08:00 ~ 18:00', sub: '주말·공휴일 별도 문의' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 bg-steel-50 rounded-xl">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="text-sm text-steel-400 font-medium">{item.title}</div>
                      <div className="text-steel-800 font-semibold">{item.content}</div>
                      {item.sub && <div className="text-xs text-steel-400 mt-0.5">{item.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-accent-500 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-2">빠른 상담이 필요하신가요?</h3>
              <p className="text-amber-100 text-sm mb-4">전화로 즉시 상담 가능합니다.</p>
              <a
                href="tel:010-0000-0000"
                className="flex items-center justify-center gap-2 bg-white text-accent-600 font-bold px-4 py-3 rounded-xl hover:bg-amber-50 transition-colors"
              >
                📞 전화 상담하기
              </a>
            </div>
          </div>

          {/* 문의 폼 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-steel-800 mb-6">온라인 견적 문의</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="홍길동"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none ${
                        errors.name
                          ? 'border-red-400 bg-red-50 focus:border-red-500'
                          : 'border-steel-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="010-0000-0000"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none ${
                        errors.phone
                          ? 'border-red-400 bg-red-50 focus:border-red-500'
                          : 'border-steel-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                      이메일 <span className="text-steel-400 font-normal">(선택)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-steel-200 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                      문의 항목 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="service"
                      value={form.service}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none bg-white ${
                        errors.service
                          ? 'border-red-400 bg-red-50 focus:border-red-500'
                          : 'border-steel-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                      }`}
                    >
                      <option value="">선택해주세요</option>
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                    시공 장소 <span className="text-steel-400 font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="예) 경기도 수원시 ○○구"
                    className="w-full px-4 py-3 rounded-xl border border-steel-200 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                    문의 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="시공 내용, 사이즈, 수량 등 구체적으로 적어주시면 정확한 견적을 드릴 수 있습니다."
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none resize-none ${
                      errors.message
                        ? 'border-red-400 bg-red-50 focus:border-red-500'
                        : 'border-steel-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                    }`}
                  />
                  {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-accent-500"
                    />
                    <span className="text-sm text-steel-600">
                      개인정보 수집 및 이용에 동의합니다.{' '}
                      <span className="text-steel-400">
                        (이름, 연락처, 이메일은 견적 및 상담 목적으로만 사용됩니다)
                      </span>
                    </span>
                  </label>
                  {errors.agree && <p className="text-red-500 text-xs mt-1">{errors.agree}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-bold py-4 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-accent-500/30"
                >
                  견적 문의 제출하기
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
