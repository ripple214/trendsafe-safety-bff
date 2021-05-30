
import { SequentialExecutor } from '../../../common/sequential-executor';
import { getPreferences } from '../../../routes/preferences.router';
import { getAssessmentsComplianceByElement } from '../assessments/compliance-by-element';
import { getAssessmentsComplianceByCategory } from '../assessments/compliance-by-category';
import { getAssessmentsElementMonthlyTrend } from '../assessments/element-monthly-trend';
import { getAssessmentsRiskRating } from '../assessments/risk-rating';
import { getAssessmentsRiskCompliance } from '../assessments/risk-compliance';
import { getAssessmentsRuleCompliance } from '../assessments/rule-compliance';
import { getAssessmentsByDepartment } from '../assessments/assessments-by-department';
import { getAssessmentsByAssessor } from '../assessments/assessments-by-assessor';
import { getInspectionsComplianceByElement } from '../inspections/compliance-by-element';
import { getInspectionsComplianceByCategory } from '../inspections/compliance-by-category';
import { getInspectionsElementMonthlyTrend } from '../inspections/element-monthly-trend';
import { getInspectionsRiskRating } from '../inspections/risk-rating';
import { getInspectionsRiskCompliance } from '../inspections/risk-compliance';
import { getInspectionsByDepartment } from '../inspections/inspections-by-department';
import { getInspectionsByAssessor } from '../inspections/inspections-by-assessor';
import { getHazardsComplianceByCategory } from '../hazards/compliance-by-category';
import { getHazardsComplianceByElement } from '../hazards/compliance-by-element';
import { getHazardsRiskRating } from '../hazards/risk-rating';
import { getHazardsRuleCompliance } from '../hazards/rule-compliance';
import { getHazardsRiskCompliance } from '../hazards/risk-compliance';
import { getHazardsByDepartment } from '../hazards/hazards-by-department';
import { getHazardsByAssessor } from '../hazards/hazards-by-assessor';
import { getManagementsComplianceByCategory } from '../managements/compliance-by-category';
import { getManagementsComplianceByElement } from '../managements/compliance-by-element';
import { getIncidentsComplianceByCategory } from '../incidents/compliance-by-category';
import { getIncidentsComplianceByElement } from '../incidents/compliance-by-element';
import { getIncidentsRiskCompliance } from '../incidents/risk-compliance';
import { getIncidentsImmediateCauseAnalysis } from '../incidents/immediate-cause-analysis';
import { getIncidentsRuleCompliance } from '../incidents/rule-compliance';
import { getIncidentsSystemAndOrganizationCauses } from '../incidents/system-and-organization-causes';
import { getCCMSComplianceByCategory } from '../ccms/compliance-by-category';
import { getCCMSComplianceByElement } from '../ccms/compliance-by-element';
import { getCCMSRiskCompliance } from '../ccms/risk-compliance';
import { getCCMSRuleCompliance } from '../ccms/rule-compliance';
import { getIndicatorsMonthlyPerformanceReport } from '../indicators/monthly-performance-report';
import { getIndicatorsTrendReport } from '../indicators/trend-report';

/* GET rule compliance report */
export const dashboardReport = (req, res) => {

  getPreferences(req, 
    (data) => {
      let resp = {};

      let preferences = data;

      let executor = new SequentialExecutor().chain();
      let parallels = [];
      preferences.widgets.forEach(widget => {
        if(widget.is_activated) {
          parallels.push((resolve, reject) => {
            getReport(req, widget.id,
              (data) => {
                resp[widget.id] = data;
                resolve(true);
              }, 
              (error) => {
                reject(error);
              }
            );
          });
        }
      });

      executor
      .parallel(parallels)
      .fail((error) => {
        res.status(400);
        res.json(error);
      })
      .success(() => {
        res.status(200);
        res.json(resp);
      })
      .execute();
    }, 
    (error) => {
      res.status(400);
      res.json(error);
    }
  );
};

const getReport = (req, widgetId, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  switch(widgetId) {
    case "TA-CE": getAssessmentsComplianceByElement(req, onSuccess, onError); break;
    case "TA-CC": getAssessmentsComplianceByCategory(req, onSuccess, onError); break;
    case "TA-EMT": getAssessmentsElementMonthlyTrend(req, onSuccess, onError); break;
    case "TA-RR": getAssessmentsRiskRating(req, onSuccess, onError);  break;
    case "TA-MRC": getAssessmentsRiskCompliance(req, onSuccess, onError);  break;
    case "TA-SR": getAssessmentsRuleCompliance(req, onSuccess, onError);  break;
    case "TA-APD": getAssessmentsByDepartment(req, onSuccess, onError);  break;
    case "TA-AA": getAssessmentsByAssessor(req, onSuccess, onError);  break;
    
    case "PAI-CE": getInspectionsComplianceByElement(req, onSuccess, onError);  break;
    case "PAI-CC": getInspectionsComplianceByCategory(req, onSuccess, onError);  break;
    case "PAI-EMT": getInspectionsElementMonthlyTrend(req, onSuccess, onError);  break;
    case "PAI-RR": getInspectionsRiskRating(req, onSuccess, onError);  break;
    case "PAI-MRC": getInspectionsRiskCompliance(req, onSuccess, onError);  break;
    case "PAI-IPD": getInspectionsByDepartment(req, onSuccess, onError);  break;
    case "PAI-IA": getInspectionsByAssessor(req, onSuccess, onError);  break;
    
    case "HR-HR": getHazardsComplianceByElement(req, onSuccess, onError);  break;
    case "HR-DER": getHazardsComplianceByCategory(req, onSuccess, onError);  break;
    case "HR-RR": getHazardsRiskRating(req, onSuccess, onError);  break;
    case "HR-SR": getHazardsRuleCompliance(req, onSuccess, onError);  break;
    case "HR-MRC": getHazardsRiskCompliance(req, onSuccess, onError);  break;
    case "HR-HRPD": getHazardsByDepartment(req, onSuccess, onError);  break;
    case "HR-HRP": getHazardsByAssessor(req, onSuccess, onError);  break;
    
    case "TRM-HP": getManagementsComplianceByElement(req, onSuccess, onError);  break;
    case "TRM-DER": getManagementsComplianceByCategory(req, onSuccess, onError);  break;
        
    case "II-APFM-DE": getIncidentsComplianceByCategory(req, onSuccess, onError);  break;
    case "II-APFM-T10H": getIncidentsComplianceByElement(req, onSuccess, onError);  break;
    case "II-MRC": getIncidentsRiskCompliance(req, onSuccess, onError);  break;
    case "II-ICAG": getIncidentsImmediateCauseAnalysis(req, onSuccess, onError);  break;
    case "II-SOC": getIncidentsSystemAndOrganizationCauses(req, onSuccess, onError);  break;
    case "II-SR": getIncidentsRuleCompliance(req, onSuccess, onError);  break;
    
    //case "LI-PPI-MP": getIndicatorsMonthlyPerformanceReport(req, onSuccess, onError);  break;
    case "LI-PPI-TR": getIndicatorsTrendReport(req, onSuccess, onError);  break;
    
    //case "LI-LSI-MP": getIndicatorsMonthlyPerformanceReport(req, onSuccess, onError);  break;
    case "LI-LSI-TR": getIndicatorsTrendReport(req, onSuccess, onError);  break;
    
    case "CCM-DE-HT": getCCMSComplianceByCategory(req, onSuccess, onError);  break;
    case "CCM-H-HT": getCCMSComplianceByElement(req, onSuccess, onError);  break;
    case "CCM-MRC": getCCMSRiskCompliance(req, onSuccess, onError);  break;
    case "CCM-SRB": getCCMSRuleCompliance(req, onSuccess, onError);  break;
  }
}
