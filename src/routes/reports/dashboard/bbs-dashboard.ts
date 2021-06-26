
import { SequentialExecutor } from '../../../common/sequential-executor';
import { getPreferences } from '../../preferences.router';
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

/* GET bbs dashboard report */
export const bbsDashboardReport = (req, res) => {

  let executor = new SequentialExecutor().chain();
  let parallels = [];

  let resp = {};
  
  let widgets = ['TA-CE', 'TA-CC', 'TA-AA', 'HR-HR', 'HR-TOP', 'HR-DER'];
  widgets.forEach(widget => {
    if(hasReportAccess(req, widget)) {
      parallels.push((resolve, reject) => {
        getReport(req, widget,
          (data) => {
            resp[widget] = data;
            resolve(true);
          }, 
          (error) => {
            reject(error);
          }
        );
      });
    }

    if(parallels.length > 0) {
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
    } else {
      res.status(200);
      res.json();
    }
  });
};

const getReport = (req, widgetId, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  switch(widgetId) {
    case "TA-CE": getAssessmentsComplianceByElement(req, onSuccess, onError); break;
    case "TA-CC": getAssessmentsComplianceByCategory(req, onSuccess, onError); break;
    case "TA-AA": req.query.chartType = 'BAR'; getAssessmentsByAssessor(req, onSuccess, onError);  break;
    
    case "HR-HR": req.query.chartType = 'PIE'; req.query.hazardType = 'ALL'; getHazardsComplianceByElement(req, onSuccess, onError);  break;
    case "HR-TOP": req.query.chartType = 'PIE'; req.query.hazardType = 'TOP'; getHazardsComplianceByElement(req, onSuccess, onError);  break;
    case "HR-DER": req.query.chartType = 'PIE'; req.query.hazardType = 'ALL'; getHazardsComplianceByCategory(req, onSuccess, onError);  break;
  }
}

const hasReportAccess = (req, widgetId): boolean => {
  let moduleId = widgetId.split('-')[0];
  
  let user = req['user'];

  return (user.module_access != undefined && user.module_access.indexOf(moduleId) > -1);
}