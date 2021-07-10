
import { SequentialExecutor } from '../../../common/sequential-executor';
import { getAssessmentsComplianceByElement } from '../assessments/compliance-by-element';
import { getAssessmentsComplianceByCategory } from '../assessments/compliance-by-category';
import { getAssessmentsByAssessor } from '../assessments/assessments-by-assessor';
import { getHazardsComplianceByCategory } from '../hazards/compliance-by-category';
import { getHazardsComplianceByElement } from '../hazards/compliance-by-element';

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