var MailControllers = angular.module("aq.mail.controllers", ['ui.bootstrap']);

/**
 * Controller de la page contenant la liste des Mails
 */
MailControllers.controller("MailListCtrl", [
    "$scope", "$location", "MailGetAll", "$rootScope", function ($scope, $location, MailGetAll, $rootScope) {
        $scope.isEditMode = true;
        $scope.detail = function (mail) {
            $location.url("/mails/" + mail._id);
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        MailGetAll.query(function (mails) {
            $scope.mails = mails;
        });
    }
]);


/**
 * Controller de la page contenant le detail d'un Mail
 */
MailControllers.controller("MailDetailCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "MailRemovePdf", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypesGet", "MailVariables","$modal",
    function ($scope, $q, $routeParams, $location, toastService, MailRemovePdf, MailSave, MailUpdate, MailRemove, MailGetById, MailTypesGet, MailVariables, $modal) {
        $scope.mail = {};
        $scope.mailTypes = [];
        $scope.nsUploadFiles = {
            isSelected: false
        };

        $scope.langChange = function (lang) {
            $scope.lang = lang;
        };

        $scope.additionnalButtons = [
            {
                text: 'mail.detail.test',
                onClick: function () {
                    $scope.openItemModal($scope.lang, $scope.mail.type)
                },
                icon:'<i class="fa fa-envelope-o" aria-hidden="true"></i>'
            }
        ]

        if($routeParams.mailId != "new")
        {
            $scope.isEditMode = true;
        }
        else
        {
            //Mode création
            $scope.isEditMode = false;
        }
        //On récupére les types de mail pour les ajouter au select
        MailTypesGet.query({}, function (mailTypes) {
            $scope.mailTypes = mailTypes;
        });

        $scope.getNameAttachment = function(file){
            let name = file.name.originalname + "." + file.name.mimetype.split("/")[1];
            return name;
        }
        
        $scope.MailGetById = function () {
            MailGetById.query({_id: $routeParams.mailId}, function (mail) {
                $scope.mail = mail;
            });
        };
        //On récupére le document uniquement si nous sommes en mode edit
        if($scope.isEditMode)
        {
            $scope.MailGetById();
        }else{
            $scope.mail.type = "";
        }

        $scope.after = function(){
            $scope.MailGetById();
            toastService.toast("success", "Fichier sauvegardé !");
        }

        $scope.uploadError = function(){
                toastService.toast("danger", "Le fichier n'a pas été sauvegardé");
        }

        $scope.deletePdf = function(position, lang){
            let path = $scope.mail.translation[lang].attachments[position].path;
            $scope.mail.translation[lang].attachments.splice(position, 1);
            MailRemovePdf.removePdf({mail:$scope.mail, path}, function (response) {
                if (response.msg) {
                    toastService.toast("danger", "Le fichier n'a pas été supprimé");
                    $scope.MailGetById();
                }
                else {
                    toastService.toast("success", "Fichier supprimé !");
                    $scope.MailGetById();
                }
            }, function (err) {
                if (err.data && err.data.translations) {
                    return deferred.reject(err.data.translations.fr);
                }
                return deferred.reject(err);
            });
        }

        $scope.component_template = MailVariables.component_template;

        //Ajout ou update d'un mail
        $scope.save = function (isQuit) {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            $scope.form.nsSubmitted = true;
            if($scope.form.$invalid)
            {
                toastService.toast("success", "Mail sauvegardé !");
                return;
            }
            var deferred = $q.defer();
            if($scope.isEditMode)
            {
                MailUpdate.update($scope.mail, function (response) {
                    if(response.msg)
                    {
                        deferred.reject({message: "Impossible de mettre à jour le mail"});
                    }
                    else
                    {
                        deferred.resolve(response);
                    }
                }, function (err) {
                    if(err.data && err.data.message)
                    {
                        return deferred.reject(err.data.message);
                    }
                    return deferred.reject(err);
                });
            }
            else
            {
                MailSave.save($scope.mail, function (response) {
                    deferred.resolve(response);
                }, function (err) {
                    if(err.data && err.data.message)
                    {
                        return deferred.reject(err.data.message);
                    }
                    return deferred.reject(err);
                });
            }
            deferred.promise.then(function (response) {
                if(isQuit)
                {
                    $location.path("/mails");
                }
                else
                {
                    toastService.toast("success", "Mail sauvegardé !");
                    $location.path("/mails/" + response._id);
                }

            }, function (err) {
                if(err)
                {
                    toastService.toast("danger", err);
                }
                else
                {
                    toastService.toast("danger", err);
                }
            });
        };

        //Suppression d'un mail
        $scope.remove = function (_id) {
            if(confirm("Êtes-vous sûr de vouloir supprimer ce mail ?"))
            {
                MailRemove.remove({_id: _id}, function () {
                    toastService.toast("success", "Mail supprimé");
                    $location.path("/mails");
                });
            }
        };


        //Ouverture de la modal d'envoie de mails test
        $scope.openItemModal = function (lang, mail) {
            $modal.open({
                templateUrl: 'app/mail/views/mail-detail-test.html',
                controller: 'MailDetailTestCtrl',
                resolve: {
                    mail: function () {
                        return $scope.mail;
                    },
                    lang: function () {
                        return lang;
                    }
                }
            }).result.then(function () {
            });
        };

    }
]);

MailControllers.controller("MailDetailTestCtrl", [
    "$scope", "$rootScope","$q", "$routeParams", "$location", "toastService", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypeGet", "MailVariables", "TestMail", "mail", "$modalInstance","lang",
    function ($scope,$rootScope,$q, $routeParams, $location, toastService, MailSave, MailUpdate, MailRemove, MailGetById, MailTypeGet, MailVariables, TestMail, mail,$modalInstance, lang) {
        $scope.path = $routeParams.mailId; 
        $scope.mail = mail;
        $scope.lang = lang;
        $scope.adminLang = $rootScope.adminLang;
        $scope.loading = false;
        MailTypeGet.query({code:$scope.mail.type}, function (mailType) {
            $scope.mailType = mailType;
        });

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        //Envoie de mail test
        $scope.testMail = function(variables){
            $scope.loading = true;
            if($scope.mail.to && $scope.mail.to !== "") {
                for (var data in variables) {
                    if (variables[data].text === undefined){
                        variables[data].text = "";
                    };
                }
                TestMail.query({ mail: $scope.mail, values: variables, lang: $scope.lang }, function (res) {
                    toastService.toast("success", "Mail Test envoyé.");
                    $scope.loading = false;
                    $modalInstance.close();
                }, function (r) {
                    toastService.toast("warning", r.data.message);
                    $scope.loading = false;
                })
            }else{
                $scope.loading = false;
                toastService.toast("warning", "Veuillez saisir le destinataire.");
            }
        }
    }
]);
