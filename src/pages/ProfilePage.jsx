import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateUser, uploadProfileImage } from '../supabase/db';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileRef  = useRef();

  const [name,         setName]         = useState(user?.name || '');
  const [phone,        setPhone]        = useState(user?.phone || '');
  const [address,      setAddress]      = useState(user?.address || '');
  const [addressDetail, setAddressDetail] = useState(user?.addressDetail || '');
  const [deliveryMemo, setDeliveryMemo] = useState(user?.deliveryMemo || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [uploading,    setUploading]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [zipCode,      setZipCode]      = useState(user?.zipCode || '');

  // 프로필 이미지 업로드
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const url = await uploadProfileImage(user.id, file);
      setProfileImage(url);
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  // 행정안전부 주소 검색 팝업 (Daum Postcode)
  const openAddressSearch = () => {
    if (!window.daum?.Postcode) {
      // 스크립트 동적 로드
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = () => openDaumPostcode();
      document.head.appendChild(script);
    } else {
      openDaumPostcode();
    }
  };

  const openDaumPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      const addr = data.roadAddress || data.jibunAddress || '';
      setAddress(addr);
      setZipCode(data.zonecode || '');
      setAddressDetail('');
    },
  }).open();
};

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const updated = { name, phone, address, addressDetail, deliveryMemo, profileImage, zipCode };
      console.log('저장 데이터:', updated);
      await updateUser(user.id, updated);
      refreshUser(updated);
      navigate(-1);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="page">
      <TopBar title="프로필 설정" showBack />
      <div className="page-content fade-in">

        {/* 프로필 이미지 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '18px 0 20px',
        }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--bg-surface-secondary)',
              border: '2px solid var(--accent-primary)',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}
          >
            {/* 프로필 이미지 또는 기본 아이콘 */}
            {profileImage ? (
              <img src={profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <circle cx="17" cy="13" r="6" stroke="var(--accent-primary)" strokeWidth="1.5"/>
                  <path d="M5 31c0-6.6 5.4-12 12-12s12 5.4 12 12"
                    stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
            )}
            {/* 사선 반투명 하단 반원 오버레이 */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '46%',
              background: 'rgba(0,0,0,0.38)',
              clipPath: 'ellipse(50% 100% at 50% 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingTop: 6,
            }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M10.5 1.5a1.5 1.5 0 012.12 2.12L4.5 11.75 2 12.5l.75-2.5L10.5 1.5z"
                  stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          </div>
          {uploading && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>업로드 중...</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>

        {/* 폼 */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '0.5px solid var(--border-default)',
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          <FormField label="이름 변경" value={name} onChange={setName} placeholder="이름" />
          <div style={{ height: '0.5px', background: 'var(--border-default)' }} />
          <PhoneField value={phone} onChange={setPhone} />
          <div style={{ height: '0.5px', background: 'var(--border-default)' }} />

          {/* 주소 (팝업 검색) */}
          <div style={{ padding: '10px 13px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>주소 변경</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div style={{
  flex: 1, borderRadius: 'var(--radius-sm)',
  border: '0.5px solid var(--border-input)',
  background: 'var(--bg-surface-secondary)',
  padding: '6px 10px',
  fontSize: 12, color: address ? 'var(--text-primary)' : 'var(--text-hint)',
  minHeight: 38, display: 'flex', flexDirection: 'column', justifyContent: 'center',
}}>
  {address ? (
    <>
      {zipCode && (
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>
          [{zipCode}]
        </div>
      )}
      <div>{address}</div>
    </>
  ) : '주소를 검색해 주세요'}
</div>
              <button
                onClick={openAddressSearch}
                style={{
                  height: 38, padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-green)',
                  border: '0.5px solid var(--border-default)',
                  fontSize: 12, color: 'var(--accent-green-dark)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                }}
              >
                검색
              </button>
            </div>
            <input
              type="text"
              value={addressDetail}
              onChange={e => setAddressDetail(e.target.value)}
              placeholder="상세 주소 (동, 호수 등)"
              style={{
                width: '100%', height: 38,
                borderRadius: 'var(--radius-sm)',
                border: '0.5px solid var(--border-input)',
                background: 'var(--bg-input)',
                padding: '0 10px',
                fontSize: 12, color: 'var(--text-primary)',
              }}
            />
          </div>
          <div style={{ height: '0.5px', background: 'var(--border-default)' }} />

          {/* 배송 메모 */}
          <div style={{ padding: '10px 13px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>배송 메모</div>
            <textarea
              value={deliveryMemo}
              onChange={e => setDeliveryMemo(e.target.value)}
              placeholder="예: 부재 시 경비실 맡겨주세요"
              rows={3}
              style={{
                width: '100%',
                borderRadius: 'var(--radius-sm)',
                border: '0.5px solid var(--border-input)',
                background: 'var(--bg-input)',
                padding: '8px 10px',
                fontSize: 12, color: 'var(--text-primary)',
                resize: 'none', lineHeight: 1.6,
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', height: 44,
            borderRadius: 'var(--radius-md)',
            background: saving ? 'var(--border-strong)' : 'var(--accent-primary)',
            border: 'none', color: '#fff',
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            transition: 'background var(--transition-fast)',
          }}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>

        <div style={{ height: 20 }} />
      </div>
      <BottomNav />
    </div>
  );
}

function PhoneField({ value, onChange }) {
  const handleChange = (e) => {
    // 숫자만 추출
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    // 010-0000-0000 형식으로 포맷
    let formatted = digits;
    if (digits.length > 3 && digits.length <= 7) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length > 7) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    onChange(formatted);
  };

  const isValid = !value || /^010-\d{4}-\d{4}$/.test(value);

  return (
    <div style={{ padding: '10px 13px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>핸드폰 번호</div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="010-0000-0000"
        maxLength={13}
        style={{
          width: '100%', height: 38,
          borderRadius: 'var(--radius-sm)',
          border: `0.5px solid ${!isValid && value ? '#c87070' : 'var(--border-input)'}`,
          background: 'var(--bg-input)',
          padding: '0 10px',
          fontSize: 12, color: 'var(--text-primary)',
        }}
      />
      {!isValid && value && (
        <div style={{ fontSize: 10, color: '#c87070', marginTop: 3 }}>
          010-0000-0000 형식으로 입력해 주세요
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ padding: '10px 13px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 38,
          borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--border-input)',
          background: 'var(--bg-input)',
          padding: '0 10px',
          fontSize: 12, color: 'var(--text-primary)',
        }}
      />
    </div>
  );
}
