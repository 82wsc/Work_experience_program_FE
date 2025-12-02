import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import GlobalHeader from '../components/GlobalHeader';
import GlobalFooter from '../components/GlobalFooter';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DashboardSummary {
    totalCampaigns: number;
    statusCounts: {
        ONGOING?: number;
        CASE_REGISTERED?: number;
        CREATING?: number;
        DB_REGISTERED?: number;
    };
    totalKnowledge: number;
}

interface RecentActivityItem {
    campaignId: string;
    requestDate: string;
    marketerId: string;
    purpose: string;
    coreBenefitText: string;
    sourceUrl: string;
    customColumns: string;
    status: string;
    actualCtr: number;
    conversionRate: number;
    updatedAt: string;
    messageResults: any[];
}

const statusMapping: { [key: string]: { label: string; color: string } } = {
    CREATING: { label: '생성중', color: '#FFC107' },
    ONGOING: { label: '진행중', color: '#007BFF' },
    CASE_REGISTERED: { label: '사례 등록', color: '#28A745' },
    DB_REGISTERED: { label: 'DB 등록', color: '#00C6FF' },
};

const CampaignStatus: React.FC<{ totalCampaigns: number, statusCounts: DashboardSummary['statusCounts'] }> = ({ totalCampaigns, statusCounts }) => {
    const statusOrder: (keyof DashboardSummary['statusCounts'])[] = ['CREATING', 'ONGOING', 'CASE_REGISTERED', 'DB_REGISTERED'];

    const chartData = {
        labels: statusOrder.map(key => statusMapping[key]?.label || key),
        datasets: [
            {
                data: statusOrder.map(key => statusCounts[key] || 0),
                backgroundColor: statusOrder.map(key => statusMapping[key]?.color || '#E0E0E0'),
                borderColor: statusOrder.map(key => statusMapping[key]?.color || '#E0E0E0'),
                borderWidth: 1,
                cutout: '80%',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // Disable default legend
            },
            tooltip: {
                enabled: true,
            }
        },
    };

    const textCenterPlugin = {
        id: 'textCenter',
        beforeDraw: (chart: ChartJS) => {
            const { ctx } = chart;
            const centerX = chart.getDatasetMeta(0).data[0]?.x;
            const centerY = chart.getDatasetMeta(0).data[0]?.y;

            if (!centerX || !centerY) return;
            
            ctx.save();
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${totalCampaigns}개`, centerX, centerY - 10);

            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText('총 캠페인', centerX, centerY + 15);
            ctx.restore();
        }
    };

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
        <div id="campaign-status" className="home-section">
            <h2>캠페인 현황</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                    <Doughnut data={chartData} options={options} plugins={[textCenterPlugin]} />
                </div>
                <div className="custom-legend" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: '40px' }}>
                    {statusOrder.map(key => {
                        const statusInfo = statusMapping[key];
                        const value = statusCounts[key];
                        if (!statusInfo) return null;
                        return (
                            <div 
                                key={key} 
                                style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    marginBottom: '10px',
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: hexToRgba(statusInfo.color, 0.1),
                                    border: `1px solid ${hexToRgba(statusInfo.color, 0.3)}`,
                                    color: '#333'
                                }}
                            >
                                <span style={{ width: '10px', height: '10px', backgroundColor: statusInfo.color, marginRight: '8px', borderRadius: '50%' }}></span>
                                <span>{statusInfo.label}: <strong>{value || 0}개</strong></span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
const RecentPromotions: React.FC<{ activities: RecentActivityItem[] }> = ({ activities }) => {
    const navigate = useNavigate();

    const handleActivityClick = (campaignId: string) => {
        navigate(`/campaigns/${campaignId}`);
    };

    const getStatusDisplayName = (status: string): string => {
        switch (status) {
            case 'PROCESSING':
                return 'AI 메시지 생성 중';
            case 'REFINING':
                return 'AI 메시지 수정 중';
            case 'COMPLETED':
                return '메시지 생성 완료';
            case 'FAILED':
                return '메시지 생성 실패';
            case 'MESSAGE_SELECTED':
                return '메시지 선택 완료';
            case 'PERFORMANCE_REGISTERED':
                return '성과 등록 완료';
            case 'SUCCESS_CASE':
                return '성공 사례 지정';
            case 'RAG_REGISTERED':
                return 'RAG DB 등록 완료';
            default:
                return status;
        }
    };

    return (
        <div id="recent-promotions" className="home-section">
            <h2>최근 프로모션</h2>
            {activities.length > 0 ? (
                <ul>
                    {activities.map((activity) => (
                        <li key={activity.campaignId} onClick={() => handleActivityClick(activity.campaignId)}>
                            {activity.purpose} ({getStatusDisplayName(activity.status)})
                        </li>
                    ))}
                </ul>
            ) : (
                <p>최근 활동이 없습니다.</p>
            )}
        </div>
    );
};


import mainViewImage from '../assets/main_view.png';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
    const [recentActivityData, setRecentActivityItem] = useState<RecentActivityItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const summaryResponse = await axios.get<DashboardSummary>('/api/dashboard/summary');
                setSummaryData(summaryResponse.data);

                const activityResponse = await axios.get<RecentActivityItem[]>('/api/dashboard/recent-activity');
                setRecentActivityItem(activityResponse.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError("대시보드 데이터를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleNewPromotionClick = () => {
        navigate('/promotion/create');
    };

    if (loading) {
        return (
            <div className="home-container">
                <div className="loading-message">데이터를 불러오는 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="home-container">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="home-container">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <img src={mainViewImage} alt="Main Visual" style={{ width: '100%', maxWidth: '800px', marginBottom: '20px' }} />
                <button className="new-promotion-button" onClick={handleNewPromotionClick}>새 프로모션 만들기</button>
            </div>
            {summaryData && <CampaignStatus totalCampaigns={summaryData.totalCampaigns} statusCounts={summaryData.statusCounts} />}
            <RecentPromotions activities={recentActivityData} />
        </div>
    );
};

export default Home;
