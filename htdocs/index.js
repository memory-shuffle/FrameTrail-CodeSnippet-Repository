(function () {

    let adminPassword;

    $('#LogoutButton').click(() => {
        $('#LoginStatus').text('You are a guest.');
        adminPassword = undefined;
    });

    $('#postSnippet form').on('reset', () => $('#postAnswer').empty());

    $('#searchSnippets form').on('reset', () => $('#searchAnswer').empty());

    $('#resetViewSnippet').click(() => $('#viewSnippetPort').empty());


    $('#LoginButton').click(() => {

        const userInput = $('#inputAdminPassword').val();

        $.post({
            url: '/api/isadmin',
            data: JSON.stringify({ adminPassword: userInput }),
            contentType: 'application/json'
        }).done(
            response => {
                if (response.isadmin) {
                    $('#LoginStatus').text('You are admin.');
                    adminPassword = userInput;
                } else {
                    $('#LoginStatus').text('You are NOT admin.');
                    adminPassword = undefined;
                }
            }
        ).fail(
            error => {
                $('#LoginStatus').text(JSON.stringify(error, null, 4));
                adminPassword = undefined;
            }
        );

    });



    $('#postSnippet form').submit(function (event) {

        event.preventDefault();

        $.post({
            url: '/api/post',
            data: serializeFormElement(this),
            contentType: 'application/json'
        }).done(
            response => $('#postAnswer').text(JSON.stringify(response, null, 4))
        ).fail(
            error => $('#postAnswer').text(JSON.stringify(error, null, 4))
        );

    });


    $('#searchSnippets form').submit(function (event) {

        event.preventDefault();

        $.post({
            url: '/api/search',
            data: serializeFormElement(this),
            contentType: 'application/json'
        }).done(
            response => {
                if (response.error) {
                    return $('#searchAnswer').empty().text(JSON.stringify(response, null, 4));
                }
                const resultView = $('#searchAnswer'),
                      list = $('<ul></ul>');
                resultView.empty().append(list);
                for (let i in response) {
                    let listItem = $(
                        '<li>ID ' +
                        response[i].id +
                        ': ' +
                        response[i].name +
                        ' <i>by ' +
                        response[i].author +
                        '</i></li>'
                    );
                    listItem.click((id => () => {
                        getSnippet(id);
                    })(response[i].id));
                    list.append(listItem);
                }
            }
        ).fail(
            error => $('#searchAnswer').text(JSON.stringify(error, null, 4))
        );

    });



    function getSnippet(id) {

        $.post({
            url: '/api/get',
            data: JSON.stringify({
                id,
                adminPassword
            }),
            contentType: 'application/json'
        }).done(
            response => {
                $('#viewSnippetPort').text(JSON.stringify(response, null, 4));
                if (adminPassword) {
                    const viewSnippetPort = $('#viewSnippetPort'),
                          buttonPublic = $('<button id="">Make Public (admin)</button>'),
                          buttonPrivate = $('<button id="">Make Private (admin)</button>'),
                          buttonDelete = $('<button id="">Delete (admin)</button>');
                    viewSnippetPort.append('<br>', buttonPublic, buttonPrivate, buttonDelete);
                    buttonPublic.click(() => makeSnippetPublic(id, true));
                    buttonPrivate.click(() => makeSnippetPublic(id, false));
                    buttonDelete.click(() => deleteSnippet(id));
                }
            }
        ).fail(
            error => $('#viewSnippetPort').text(JSON.stringify(error, null, 4))
        );

    }


    function makeSnippetPublic(id, isPublic) {
        $.post({
            url: '/api/public',
            data: JSON.stringify({
                adminPassword: adminPassword,
                id: id,
                public: isPublic
            }),
            contentType: 'application/json'
        }).done(
            response => {
                if (response.success) {
                    getSnippet(id);
                } else {
                    $('#viewSnippetPort').text(JSON.stringify(response, null, 4));
                }
            }
        ).fail(
            error => $('#viewSnippetPort').text(JSON.stringify(error, null, 4))
        );
    }


    function deleteSnippet(id) {
        $.post({
            url: '/api/delete',
            data: JSON.stringify({
                adminPassword,
                id
            }),
            contentType: 'application/json'
        }).done(
            response => {
                if (response.success) {
                    $('#viewSnippetPort').empty();
                } else {
                    $('#viewSnippetPort').text(JSON.stringify(response, null, 4));
                }
            }
        ).fail(
            error => $('#LoginStatus').text(JSON.stringify(error, null, 4))
        );
    }



    function serializeFormElement(formElement) {

        const formArray = $(formElement).serializeArray(),
              result = {};

        for (let i = 0, l = formArray.length; i < l; i++) {

            if (typeof result[formArray[i].name] !== 'string') {
                result[formArray[i].name] = formArray[i].value;
            } else {
                result[formArray[i].name] += ' ' + formArray[i].value;
            }

        }

        result.adminPassword = adminPassword;

        return JSON.stringify(result);
    }

})();
