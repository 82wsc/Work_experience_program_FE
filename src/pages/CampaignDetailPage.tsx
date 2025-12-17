import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CampaignDetailPage.css';
import PerformanceModal from '../components/PerformanceModal'; // Import the modal
import RefineRequestModal from '../components/RefineRequestModal'; // Import the RefineRequestModal
import AiValidatorReport from '../components/AiValidatorReport';

const marketingTips = [
  "메시지에 고객의 이름을 넣어 개인화를 시도해보세요. '[이름]님'이 '고객님'보다 훨씬 높은 반응을 이끌어낼 수 있습니다.",
  "긴급성을 부여하는 문구를 사용해보세요. '기간 한정', '오늘만 이 가격'과 같은 표현은 클릭률을 높이는 데 효과적입니다.",
  "숫자를 활용하여 구체적인 혜택을 강조하세요. '큰 할인'보다는 '전 품목 20% 할인'이 더 명확하고 설득력 있습니다.",
  "고객에게 질문을 던지는 메시지는 참여를 유도하고 생각할 거리를 제공합니다. '새로운 시즌, 어떤 스타일을 찾고 계신가요?'",
  "메시지 전송 시간도 중요한 요소입니다. 타겟 고객이 가장 활발하게 활동하는 시간대를 고려하여 발송해보세요.",
  "A/B 테스트는 선택이 아닌 필수입니다. 두 가지 다른 메시지 시안 중 어떤 것이 더 나은 성과를 보이는지 항상 확인하세요.",
  "이모티콘(😊)이나 특수문자(★)를 적절히 사용하면 메시지에 생동감을 더하고 주목도를 높일 수 있습니다.",
  "CTA(Call To Action) 버튼의 문구를 명확하게 작성하세요. '더 알아보기'나 '지금 혜택 받기'처럼 고객이 무엇을 해야 할지 정확히 알려주세요.",
  "고객의 과거 구매 데이터를 활용하면 더욱 개인화된 메시지를 만들 수 있습니다. '[관심 카테고리] 신상품을 확인해보세요!'",
  "메시지와 함께 매력적인 이미지를 사용하는 것은 고객의 시선을 사로잡는 가장 확실한 방법 중 하나입니다."
];

// --- Type Definitions based on API Spec (Reverted to original flat structure) ---
interface ValidatorReportFromAPI {
  spam_risk_score: number;
  policy_compliance: 'PASS' | 'FAIL';
  review_summary: string;
  recommended_action: string;
}

interface MessageResultFromAPI {
  resultId: string;
  targetGroupIndex: number;
  targetName: string;
  targetFeatures: string | null;
  classificationReason: string | null; // <-- Add new field
  messageDraftIndex: number;
  messageText: string;
  validatorReport: ValidatorReportFromAPI | null;
  selected: boolean;
}

interface CampaignDetailFromAPI {
  campaignId: string;
  requestDate: string;
  marketerId: string;
  purpose: string;
  coreBenefitText: string;
  sourceUrl: string | null;
  customColumns: string;
  status: string;
  actualCtr: number | null;
  conversionRate: number | null;
  performanceNotes: string | null;
  updatedAt: string;
  performanceStatus?: "SUCCESS" | "FAILURE" | "UNDECIDED"; // Use new enum field
  messageResults: MessageResultFromAPI[];
}

// --- Component's Internal Type Definitions (transformed from API) ---
interface ValidatorReport { // This is what the component expects
  spam_risk_score: number;
  policy_compliance: 'PASS' | 'FAIL';
  review_summary: string;
  recommended_action: string;
}

interface MessageResult { // This is what the component expects inside TargetGroup
  result_id: string;
  message_draft_index: 1 | 2;
  message_text: string;
  validator_report: ValidatorReport;
  is_selected: boolean;
}

interface TargetGroup {
  target_group_index: number;
  target_name: string;
  target_features: string;
  classification_reason: string; // <-- Add new field
  message_results: MessageResult[];
}

interface CampaignDetail { // This is what the component expects as its state
  campaignId: string;
  purpose: string;
  actualCtr: number | null;
  conversionRate: number | null;
  performanceNotes: string | null;
  status: string; // Add status here
  performanceStatus?: "SUCCESS" | "FAILURE" | "UNDECIDED"; // Use new enum field
  target_groups: TargetGroup[];
}

// Function to transform API response to component's expected structure (Reverted to original grouping logic)
const transformApiResponse = (apiResponse: CampaignDetailFromAPI): CampaignDetail => {
  const targetGroupsMap = new Map<number, TargetGroup>();

  // Use optional chaining and default to empty array for safety
  (apiResponse.messageResults || []).forEach(apiMessage => {
    if (!targetGroupsMap.has(apiMessage.targetGroupIndex)) {
      targetGroupsMap.set(apiMessage.targetGroupIndex, {
        target_group_index: apiMessage.targetGroupIndex,
        target_name: apiMessage.targetName,
        target_features: apiMessage.targetFeatures || '특징 정보 없음',
        classification_reason: apiMessage.classificationReason || '분류 근거 정보 없음', // <-- Populate new field
        message_results: [],
      });
    }
    const targetGroup = targetGroupsMap.get(apiMessage.targetGroupIndex)!;
    targetGroup.message_results.push({
      result_id: apiMessage.resultId,
      message_draft_index: apiMessage.messageDraftIndex as (1 | 2),
      validator_report: apiMessage.validatorReport ? {
        spam_risk_score: apiMessage.validatorReport.spam_risk_score,
        policy_compliance: apiMessage.validatorReport.policy_compliance,
        review_summary: apiMessage.validatorReport.review_summary,
        recommended_action: apiMessage.validatorReport.recommended_action, // Corrected field
      } : { // Default validator report if null
        spam_risk_score: 0,
        policy_compliance: 'PASS',
        review_summary: 'No report available',
        recommended_action: 'None', // Corrected field
      },
      message_text: apiMessage.messageText,
      is_selected: apiMessage.selected,
    });
  });

  return {
    campaignId: apiResponse.campaignId,
    purpose: apiResponse.purpose,
    actualCtr: apiResponse.actualCtr,
    conversionRate: apiResponse.conversionRate,
    performanceNotes: apiResponse.performanceNotes,
    status: apiResponse.status,
    performanceStatus: apiResponse.performanceStatus, // Map new field
    target_groups: Array.from(targetGroupsMap.values()),
  };
};

const statusMap: { [key: string]: string } = {
  PROCESSING: '처리 중',

  REFINING: '수정 중',
  COMPLETED: '생성 완료',
  FAILED: '실패',
  MESSAGE_SELECTED: '메시지 선택 완료',
  PERFORMANCE_REGISTERED: '성과 등록 완료',
  SUCCESS_CASE: '성공 사례 지정',
  RAG_REGISTERED: 'AI 학습완료',
};

const getRagButtonTooltip = (campaign: CampaignDetail): string => {
  if (campaign.status === 'RAG_REGISTERED') {
    return "이미 학습된 캠페인입니다.";
  }
  if (campaign.performanceStatus === "UNDECIDED") {
    return "미정 상태의 캠페인은 학습에 사용할 수 없습니다.";
  }
  if (campaign.performanceStatus === "SUCCESS") {
    return "이 캠페인을 '성공 사례'로 AI 학습자료에 저장합니다.";
  }
  if (campaign.performanceStatus === "FAILURE") {
    return "이 캠페인을 '실패 사례'로 AI 학습자료에 저장합니다.";
  }
  
  return "AI 학습자료에 등록하려면 성과 등록을 완료해야 합니다.";
};

const getPerformanceButtonText = (status: string): string => {
  if (status === 'PERFORMANCE_REGISTERED' || status === 'SUCCESS_CASE' || status === 'RAG_REGISTERED') {
    return "성과 수정";
  }
  return "성과 등록";
};

const getPerformanceButtonTooltip = (status: string): string => {
  if (status === 'PROCESSING' || status === 'REFINING' || status === 'FAILED') {
    return "메시지 생성 완료 후 성과 등록이 가능합니다.";
  }
  if (status === 'RAG_REGISTERED') {
    return "이미 AI가 학습한 캠페인입니다. 성과 수정은 가능합니다.";
  }
  if (status === 'COMPLETED') {
    return "메시지 선택 후 성과 등록이 가능합니다.";
  }
  return "캠페인 성과(CTR, 전환율)를 등록 또는 수정합니다.";
};

const getRefineButtonTooltip = (status: string): string => {
  if (status === 'PROCESSING' || status === 'REFINING' || status === 'FAILED') {
    return "메시지 생성 완료 후 수정 요청이 가능합니다.";
  }
  if (status === 'RAG_REGISTERED') {
    return "이미 AI가 학습된 캠페인입니다. 수정 요청은 불가능합니다.";
  }
  return "메시지 내용, 타겟, 목적 등을 수정 요청합니다.";
};

const CampaignDetailPage = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [initialCampaign, setInitialCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [loadingTip, setLoadingTip] = useState('');
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});
  const [tipKey, setTipKey] = useState(0); // New state for dynamic tip transition
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  const toggleReason = (index: number) => {
    setExpandedReasons(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleTitle = () => {
    setIsTitleExpanded(!isTitleExpanded);
  };

  const fetchCampaignDetail = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      setError(null);
      const response = await axios.get<CampaignDetailFromAPI>(`/api/campaigns/${campaignId}`);
      const transformedData = transformApiResponse(response.data);
      
      // Only set initial campaign on the first load
      if (isInitialLoad || !initialCampaign) {
        setInitialCampaign(JSON.parse(JSON.stringify(transformedData))); 
      }
      setCampaign(transformedData);

    } catch (err) {
      console.error('Error fetching campaign details:', err);
      setError('캠페인 정보를 불러오는 데 실패했습니다.');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetail(true);
    }
  }, [campaignId]);

  // Polling effect for processing status
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (campaign && ['PROCESSING', 'REFINING'].includes(campaign.status)) {
      intervalId = setInterval(() => {
        console.log('Polling for campaign status...');
        fetchCampaignDetail(false); // Pass false for subsequent polls
      }, 5000); // Poll every 5 seconds
    }

    // Cleanup function to clear interval when status changes or component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [campaign?.status, campaignId]);

  // Effect for rotating tips during processing
  useEffect(() => {
    if (campaign && ['PROCESSING', 'REFINING'].includes(campaign.status)) {
            // Set an initial tip
            setLoadingTip(marketingTips[Math.floor(Math.random() * marketingTips.length)]);
            setTipKey(prevKey => prevKey + 1); // Increment tipKey to trigger re-render
      
            const intervalId = setInterval(() => {
              const randomIndex = Math.floor(Math.random() * marketingTips.length);
              setLoadingTip(marketingTips[randomIndex]);
              setTipKey(prevKey => prevKey + 1); // Increment tipKey to trigger re-render
            }, 12000); // Change tip every 12 seconds
      
            // Cleanup interval on component unmount or when status changes
            return () => clearInterval(intervalId);
          }
        }, [campaign?.status]);
      
        const handleSelectMessage = (resultId: string) => {
          setCampaign(prevCampaign => {
      if (!prevCampaign) return null;

      const newTargetGroups = prevCampaign.target_groups.map(group => ({
        ...group,
        message_results: group.message_results.map(result => {
          if (result.result_id === resultId) {
            return { ...result, is_selected: !result.is_selected }; // Toggle the flag
          }
          return result;
        }),
      }));

      return { ...prevCampaign, target_groups: newTargetGroups };
    });
  };

  const handleSaveSelection = async () => {
    if (!campaign) return;

    const selectedIds = campaign.target_groups
      .flatMap(g => g.message_results)
      .filter(r => r.is_selected)
      .map(r => r.result_id);

    try {
      await axios.put(`/api/campaigns/${campaignId}/selection`, {
        resultIds: selectedIds,
      });
      alert('메시지 선택이 저장되었습니다.');
      fetchCampaignDetail(); // Refetch to get updated state from server
    } catch (err) {
      console.error('Error saving selection:', err);
      alert('선택 저장에 실패했습니다.');
    }
  };

  const isButtonDisabled = (action: 'refine' | 'performance' | 'rag', currentCampaign: CampaignDetail) => {
    if (currentCampaign.status === 'RAG_REGISTERED') return true; // Already registered

    switch (action) {
      case 'refine':
        return ['PROCESSING', 'REFINING'].includes(currentCampaign.status);
      case 'performance':
        return ['PROCESSING', 'REFINING', 'FAILED', 'COMPLETED'].includes(currentCampaign.status);
      case 'rag':
        // RAG button disabled if performanceStatus is UNDECIDED, or if status is not PERFORMANCE_REGISTERED or SUCCESS_CASE
        return currentCampaign.performanceStatus === "UNDECIDED" || !['PERFORMANCE_REGISTERED', 'SUCCESS_CASE'].includes(currentCampaign.status);
      default:
        return false;
    }
  };

  const handleDeleteCampaign = async () => {
    if (window.confirm(`'${campaign?.purpose}' 캠페인을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      try {
        await axios.delete(`/api/campaigns/${campaignId}`);
        alert('캠페인이 삭제되었습니다.');
        navigate('/promotion');
      } catch (err) {
        console.error('Error deleting campaign:', err);
        alert('캠페인 삭제에 실패했습니다.');
      }
    }
  };

  const handleRefineSubmit = async (feedbackText: string) => {
    if (!campaignId) return;

    try {
      await axios.post(`/api/campaigns/${campaignId}/refine`, {
        feedback_text: feedbackText,
      });
      alert('수정 요청이 성공적으로 전송되었습니다.');
      setIsRefineModalOpen(false);
      fetchCampaignDetail(); // Re-fetch data to show updated state
    } catch (err) {
      console.error('Error submitting refinement request:', err);
      alert('수정 요청에 실패했습니다.');
    }
  };

  const handlePerformanceSubmit = async (actualCtr: number, conversionRate: number, performanceStatus: "SUCCESS" | "FAILURE" | "UNDECIDED" | undefined, performanceNotes: string) => {
    // Backend now expects performanceStatus directly, no conversion to isSuccessCase needed.

    const payload: {
      actualCtr: number;
      conversionRate: number;
      performanceStatus?: "SUCCESS" | "FAILURE" | "UNDECIDED"; // Make optional if UNDECIDED is not sent
      performanceNotes: string;
    } = {
      actualCtr,
      conversionRate,
      performanceNotes,
    };

    if (performanceStatus !== undefined) {
      payload.performanceStatus = performanceStatus;
    }

    try {
      await axios.put(`/api/campaigns/${campaignId}/performance`, payload);
      alert('성과가 성공적으로 저장되었습니다.');
      setIsPerformanceModalOpen(false);
      fetchCampaignDetail(); // Re-fetch data to show updated state
    } catch (err) {
      console.error('Error submitting performance:', err);
      alert('성과 저장에 실패했습니다.');
    }
  };

  const handleRagTrigger = async () => {
    if (!campaign) return;

    if (campaign.performanceStatus === "UNDECIDED") {
      alert("미정 상태의 캠페인은 AI 학습자료소 사용할 수 없습니다.");
      return;
    }

    const confirmMessage = campaign.performanceStatus === 'SUCCESS'
      ? '이 캠페인을 AI에게 성공 사례로 학습시키시겠습니까?'
      : '이 캠페인은 "실패" 사례입니다. AI 학습자료에 반영하시겠습니까?'; // Updated for FAILURE

    if (window.confirm(confirmMessage)) {
      try {
        await axios.post(`/api/campaigns/${campaignId}/rag-trigger`);
        alert('AI 학습자료에 성공적으로 저장되었습니다.');
        fetchCampaignDetail(); // Re-fetch data to show updated state
      } catch (err) {
        console.error('Error triggering RAG:', err);
        alert('AI 학습자료 저장에 실패했습니다.');
      }
    }
  };

  if (loading) {
    return <div className="campaign-detail-container"><h2>로딩 중...</h2></div>;
  }

  if (error) {
    return <div className="campaign-detail-container"><h2 className="error-message">{error}</h2></div>;
  }

  if (!campaign) {
    return <div className="campaign-detail-container"><h2>캠페인 정보를 찾을 수 없습니다.</h2></div>;
  }

  const getSuccessStatusInfo = (campaign: CampaignDetail): { text: string; className: string } => {
    if (campaign.performanceStatus === "SUCCESS") {
      return { text: '성공', className: 'status-SUCCESS_CASE' };
    }
    if (campaign.performanceStatus === "FAILURE") {
      return { text: '실패', className: 'status-FAILED' };
    }
    return { text: '미정', className: 'status-PROCESSING' }; // Default for UNDECIDED or if not set
  };

  const hasSelectionChanged = () => {
    if (!campaign || !initialCampaign) return false;
    const currentSelected = campaign.target_groups.flatMap(g => g.message_results).filter(r => r.is_selected).map(r => r.result_id).sort();
    const initialSelected = initialCampaign.target_groups.flatMap(g => g.message_results).filter(r => r.is_selected).map(r => r.result_id).sort();
    return JSON.stringify(currentSelected) !== JSON.stringify(initialSelected);
  };

  const successStatusInfo = getSuccessStatusInfo(campaign); // Pass campaign object

  return (
    <div className="campaign-detail-container">
      <header className="campaign-detail-header">
        <h1
          className={!isTitleExpanded ? 'truncated' : ''}
          onClick={toggleTitle}
          title="클릭하여 전체 내용 보기"
        >
          {campaign.purpose}
        </h1>
      </header>

      <main className="campaign-content">
        <section className="campaign-meta">
          <div className="meta-stats">
            <div className="meta-item">
              <strong>상태:</strong> 
              <span className={`status-badge status-${campaign.status}`}>
                {statusMap[campaign.status] || campaign.status}
              </span>
            </div>
            <div className="meta-item">
              <strong>성공여부:</strong> 
              <span className={`status-badge ${successStatusInfo.className}`}>
                {successStatusInfo.text}
              </span>
            </div>
            <div className="meta-item">
              <strong>CTR:</strong> {campaign.actualCtr !== null ? `${campaign.actualCtr}%` : 'N/A'}
            </div>
            <div className="meta-item">
              <strong>전환율:</strong> {campaign.conversionRate !== null ? `${campaign.conversionRate}%` : 'N/A'}
            </div>
          </div>
        </section>

        <section className="action-buttons">
          <div className="tooltip-container">
            <button 
              className="action-button refine-button"
              onClick={() => setIsRefineModalOpen(true)}
              disabled={isButtonDisabled('refine', campaign)}
            >
              수정 요청
            </button>
            <span className="tooltip-text">{getRefineButtonTooltip(campaign.status)}</span>
          </div>
          <div className="tooltip-container">
            <button 
              className="action-button performance-button"
              onClick={() => setIsPerformanceModalOpen(true)}
              disabled={isButtonDisabled('performance', campaign)}
            >
              {getPerformanceButtonText(campaign.status)}
            </button>
            <span className="tooltip-text">{getPerformanceButtonTooltip(campaign.status)}</span>
          </div>
          <div className="tooltip-container">
            <button 
              className="action-button rag-button"
              onClick={handleRagTrigger}
              disabled={isButtonDisabled('rag', campaign)}
            >
              AI에게 사례 학습
            </button>
            <span className="tooltip-text">{getRagButtonTooltip(campaign)}</span>
          </div>
        </section>

        {['PROCESSING', 'REFINING'].includes(campaign.status) ? (
          <div className="processing-notice">
            <h2>메시지 생성 중<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></h2>
            <p key={tipKey} className="tip-message">{loadingTip}</p>
          </div>
        ) : (
          <>
            <div className="target-group-grid">
              {campaign.target_groups.map(group => (
                <div key={group.target_group_index} className="target-group-card">
                  <div className="target-group-header">
                    <h2 className="target-group-name">{group.target_name}</h2>
                    <p className="target-group-features">{group.target_features}</p>
                    <div className="classification-reason-container">
                      <button onClick={() => toggleReason(group.target_group_index)} className="reason-toggle-button">
                        {expandedReasons[group.target_group_index] ? '분류 근거 닫기' : '분류 근거 보기'}
                      </button>
                      {expandedReasons[group.target_group_index] && (
                        <div className="classification-reason-text">
                          <p>{group.classification_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="message-drafts-container">
                    {group.message_results
                      .slice() // 정렬 전 배열 복사 (원본 상태 유지)
                      .sort((a, b) => a.message_draft_index - b.message_draft_index) // index 기준으로 정렬
                      .map((result) => (
                      <div key={result.result_id} className={`message-draft ${result.is_selected ? 'selected' : ''}`}>
                        <div>
                          <div className="message-header">
                            <h3>메시지 시안 {result.message_draft_index}</h3>
                          </div>
                          <p className="message-text">{result.message_text}</p>
                          <AiValidatorReport report={result.validator_report} />
                        </div>
                        <div className="action-buttons">
                          <button 
                            className="select-button"
                            onClick={() => handleSelectMessage(result.result_id)}
                            disabled={!['COMPLETED', 'MESSAGE_SELECTED'].includes(campaign.status)}
                          >
                            {result.is_selected ? '선택 해제' : '이 메시지 선택'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hasSelectionChanged() && (
              <div className="save-selection-container">
                <button className="save-selection-button" onClick={handleSaveSelection}>
                  선택 저장
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <PerformanceModal 
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        campaignId={campaignId!}
        onSubmit={handlePerformanceSubmit}
        initialActualCtr={campaign.actualCtr}
        initialConversionRate={campaign.conversionRate}
        initialPerformanceStatus={campaign.performanceStatus}
        initialPerformanceNotes={campaign.performanceNotes}
      />
      <RefineRequestModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onSubmit={handleRefineSubmit}
      />

      <div className="page-actions-container">
        <button 
          className="action-button"
          onClick={() => navigate('/promotion')}
        >
          목록으로
        </button>
        <button 
          className="action-button delete-button"
          onClick={handleDeleteCampaign}
        >
          캠페인 삭제
        </button>
      </div>
    </div>
  );
};


export default CampaignDetailPage;