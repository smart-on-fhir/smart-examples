'use strict';

/* Controller */

angular.module('ui.config', []).value('ui.config', {
    sortable: {
        connectWith: '.col',
        tolerance: 'pointer',
        handle: 'header',
        placeholder: 'section-placeholder',

        start: function (event, ui) {
            ui.placeholder.height(ui.item.height());
            ui.placeholder.css('margin-bottom', ui.item.css('margin-bottom'));
            ui.placeholder.css('margin-top', ui.item.css('margin-top'));
        },
        over: function (event, ui) {
            ui.item.width(ui.placeholder.width());
        },
        stop: 'foo'
    }
});


var dmController = angular.module('DM.controllers', ['DM.ViewModels','DM.Graph','DM.directives','ui' ]);
    
dmController.controller('$dmController', function ($scope, $rootScope, $dmPatient, $dmViewModels, $dmGraph) {
    // Load view models from patient model. All async loading has been finished by now. In AngularJS, $scope is the (view) model.
    var vm = $scope; // Maybe load to $rootScope?
   
  

    vm.patientViewModel = $dmPatient.patient;
    vm.foo = function () {
        vm.layoutViewModel.saveOrderSets();
    }
    var start = function () {
        vm.problemViewModel =       new $dmViewModels.ProblemViewModel();
        vm.medicineViewModel =      new $dmViewModels.MedicineViewModel();
        vm.vitalsViewModel =        new $dmViewModels.VitalsViewModel();
        vm.labResultsViewModel =    new $dmViewModels.LabResultsViewModel();
        vm.diseaseViewModel =       new $dmViewModels.DiseaseViewModel();
        vm.otherInfoViewModel =     new $dmViewModels.OtherInfoViewModel();
        vm.allergyViewModel =       new $dmViewModels.AllergyViewModel();
        vm.cartViewModel =          new $dmViewModels.CartViewModel();
        vm.graphViewModel =         new $dmViewModels.GraphViewModel();

        vm.layoutViewModel = new $dmViewModels.LayoutViewModel();

      

        vm.patientDemographicsViewModel.init();
        vm.problemMedSemanticViewModel.init();

        vm.problemViewModel.setSort();
        vm.medicineViewModel.setSort();

        vm.$watch('diseaseViewModel.disease', function (v) {
            vm.labResultsViewModel.setLabs(v.CID);
        });

        vm.$watch('problemMedSemanticViewModel.probMedSemantics', function () {
            if (vm.problemMedSemanticViewModel.probMedSemantics) {
                vm.problemMedSemanticViewModel.getMedicineProblems();
            }
            else {
                vm.problemMedSemanticViewModel.removeMedicineProblems();
            }
        });

        vm.$watch('patientDemographicsViewModel.deIdOptions.selected.value', function () {
            vm.patientDemographicsViewModel.setDeId()
        });

        

        vm.graph = new $dmGraph();

        vm.patientDemographicsViewModel.deIdentify().then(function () {
            $('body').fadeIn();
           
        });

       

    }

    // Kick start everthing
    var initialize = function () {
        // Need to create these two view models early to avoid null references in prefs
        vm.problemMedSemanticViewModel = new $dmViewModels.ProblemMedSemanticViewModel();
        vm.patientDemographicsViewModel = new $dmViewModels.PatientDemographicsViewModel();

        // For development purposes, always load from JSON - most sections will be overwritten by data in SMART
        $dmPatient.getFromJSON();
    
        // Bootstrap the FHIR JS Client
        FHIR.oauth2.settings.replaceBrowserHistory = false;
        FHIR.oauth2.ready(onReady, onError);
        
        function onError(){
            console.log("Loading error", arguments);
            start();
        };
  
        function onReady(smart){
            // Load up the patient from SMART
            // Note: we use DI to inject the patient model ($dmPatient) into the view models within the start method
            $.when(
                $dmPatient.get_demographics(smart),
                $dmPatient.get_medications(smart),
                $dmPatient.get_problems(smart),
                $dmPatient.get_allergies(smart),
                $dmPatient.get_vital_sign_sets(smart),
                $dmPatient.get_lab_results(smart)
                )
            .then(function (r) {
                start();
            });
        };
    }();
});
