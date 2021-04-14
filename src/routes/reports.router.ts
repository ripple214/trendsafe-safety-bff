import express from 'express';

import { assessmentsComplianceByElement } from './reports/assessments/compliance-by-element';
import { assessmentsComplianceByCategory } from './reports/assessments/compliance-by-category';
import { assessmentsElementMonthlyTrend } from './reports/assessments/element-monthly-trend';
import { assessmentsRiskRating } from './reports/assessments/risk-rating';

export const router = express.Router();

/* GET compliance-by-element report */
router.get('/assessments/compliance-by-element', function(req, res, next) {
  assessmentsComplianceByElement(req, res);
});

/* GET compliance-by-category report */
router.get('/assessments/compliance-by-category', function(req, res, next) {
  assessmentsComplianceByCategory(req, res);
});

/* GET element-monthly-trend report */
router.get('/assessments/element-monthly-trend', function(req, res, next) {
  assessmentsElementMonthlyTrend(req, res);
});

/* GET risk-rating report */
router.get('/assessments/risk-rating', function(req, res, next) {
  assessmentsRiskRating(req, res);
});
