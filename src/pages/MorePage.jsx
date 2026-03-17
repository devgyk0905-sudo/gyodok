import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { Card, Divider } from '../components/common';

export default function MorePage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const profileComplete = user?.address && user?.phone;

  return (
    <div className="page">
      <TopBar title="마이페이지" />
      <div className="page-content fade-in">

        {/* 미완성 프로필 안내 */}
        {!profileComplete && (
          <div style={{
            background: 'var(--accent-amber)',
            border: '0.5px solid var(--border-input)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            marginBottom: 12,
            fontSize: 12, color: 'var(--accent-amber-text)',
            lineHeight: 1.6,
          }}>
            최초 프로필 설정이 필요합니다!<br />
            <span style={{ fontWeight: 500 }}>주소 및 전화번호</span>를 등록해 주세요.
          </div>
        )}

        {/* 프로필 영역 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '18px 0 14px',
        }}>
          {/* 프로필 이미지 */}
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'var(--bg-surface-secondary)',
              border: '2px solid var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, cursor: 'pointer', overflow: 'hidden',
            }}
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="12" r="5.5" stroke="var(--accent-primary)" strokeWidth="1.5"/>
                <path d="M5 27c0-5.5 4.5-10 10-10s10 4.5 10 10"
                  stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
              </svg>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            {(user?.isAdmin || user?.is_admin) && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                background: 'var(--accent-amber)',
                fontSize: 10, fontWeight: 500, color: 'var(--accent-amber-text)',
              }}>
                관리자
              </span>
            )}
          </div>
        </div>

        {/* 내 정보 */}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8 }}>
          내 정보
        </div>
        <Card style={{ padding: '10px 13px', marginBottom: 8 }}>
          <InfoRow label="이름"     value={user?.name} />
          <Divider />
          <InfoRow label="전화번호" value={user?.phone || '미등록'} empty={!user?.phone} />
          <Divider />
          <div style={{ padding: '5px 0' }}>
  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 3 }}>배송 주소</div>
  {user?.address ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {user?.zipCode && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          [{user.zipCode}]
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
        {user.address},
      </div>
      {user?.addressDetail && (
        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
          {user.addressDetail}
        </div>
      )}
    </div>
  ) : (
    <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>미등록</div>
  )}
</div>
          {user?.deliveryMemo && (
            <>
              <Divider />
              <div style={{ padding: '5px 0' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 3 }}>배송 메모</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.deliveryMemo}</div>
              </div>
            </>
          )}
        </Card>

        <button
          onClick={() => navigate('/profile')}
          style={{
            width: '100%', height: 38,
            borderRadius: 'var(--radius-sm)',
            border: '0.5px solid var(--border-input)',
            background: 'var(--bg-surface-secondary)',
            fontSize: 12, color: 'var(--text-secondary)',
            cursor: 'pointer', marginBottom: 14,
            fontFamily: 'var(--font-sans)',
          }}
        >
          프로필 수정
        </button>

        {/* 관리자 메뉴 */}
        {(user?.isAdmin || user?.is_admin) && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8 }}>
              관리자
            </div>
            <Card style={{ padding: '0 13px', marginBottom: 14 }}>
              <button
                onClick={() => navigate('/admin/create')}
                style={{
                  width: '100%', padding: '12px 0',
                  fontSize: 13, color: 'var(--accent-amber-text)', fontWeight: 500,
                  background: 'none', border: 'none',
                  textAlign: 'center', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                + 새 교독 생성
              </button>
            </Card>
          </>
        )}

        {/* 기타 설정 */}
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8 }}>기타</div>
        <Card style={{ padding: '0 13px', marginBottom: 14 }}>
          {/* 다크 모드 토글 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 0',
            borderBottom: '0.5px solid var(--border-default)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>다크 모드</span>
            <div
              onClick={toggleTheme}
              style={{
                width: 38, height: 22, borderRadius: 11,
                background: isDark ? 'var(--accent-green)' : 'var(--status-pending)',
                position: 'relative', cursor: 'pointer',
                transition: 'background var(--transition-base)',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: isDark ? 19 : 3,
                transition: 'left var(--transition-base)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '11px 0',
              fontSize: 13, color: '#c87070',
              background: 'none', border: 'none',
              textAlign: 'left', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            로그아웃
          </button>
        </Card>

        <div style={{ height: 8 }} />
      </div>
      <BottomNav />
    </div>
  );
}

function InfoRow({ label, value, empty }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '7px 0',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 12, color: empty ? 'var(--text-hint)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
