/*
 * @author Christian Bromann <contact@christian-bromann.com>
 * @description popup script, contains buttons actions
 */

function extrapolateUrlFromCookie(cookie) {
    var prefix = cookie.secure ? "https://" : "http://";
    if (cookie.domain.charAt(0) == ".")
        prefix += "www";

    return prefix + cookie.domain + cookie.path;
}

(function() {
    $('button#addTextToPage').click(function() {
        console.log('insert text');
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {action: "inject"});
        });
    });
    $('button#screenshot').click(function() {
        chrome.tabs.captureVisibleTab(null, {format:'png'}, function (image) {

            var xhr = new XMLHttpRequest();
            var formData = new FormData();

            formData.append('screenshot', image);

            xhr.onreadystatechange = function() {
              if (this.readyState == 4) {
                  var response = JSON.parse(xhr.response);
                  if (response.error) {
                      console.log('Error: ' + response.error.message);
                      return;
                  } else {
                      console.log('screenshot was taken');
                  }
              }
            };

            xhr.open('POST', 'http://localhost/saveScreenshot', true);
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.send(formData);

        });
    });
    $('button#gmailLogin').click(function() {
        console.log('login to devthevaluator@gmail.com');

        // delete all cookies to prevent a cookie missmatch
        chrome.cookies.getAll({}, function(cookies) {
            for(var i=0; i<cookies.length;i++) {
                chrome.cookies.remove({url: extrapolateUrlFromCookie(cookies[i]), name: cookies[i].name});

                // set necessary gmail cookies
                chrome.cookies.set({url:'http://google.com',name:'HSID',value:'A4_hsC4Uj1H4VgjAl',path:'/',domain:'.google.com',httpOnly:true});
                chrome.cookies.set({url:'http://google.com',name:'SID',value:'DQAAANMAAADvIUR-4EfJ7zOHpd3FzDKr4LdO00xdLyNc-v7WojgTLr5zVsvYng5BPtZvRG-pbbJBVI_th68nCfRlUt450O1BjqBmiMzVqbUxOM32u4risekVvgSn7umtJpBUJ8G9Apu_J_rBEW9plRUOj_S-gd_bZxUoPQcM_6ZvL99SqIXrhyYv8U2xhVbxy_fMS6Ky01uSE8mu9n7U6etaC_KYZeY8_P-972LWzn9MtKv1RPmUwe4G2d7mJn5V5H2MDbd64KeF905EPUo59aqmq2zs9OSWndSwhygTXek1YGwaBcmY2g',path:'/',domain:'.google.com',secure:true,httpOnly:true});
                chrome.cookies.set({url:'http://google.com',name:'SSID',value:'ACcopQoa9D75BsUaF',path:'/',domain:'.google.com',secure:true,httpOnly:true});
                chrome.cookies.set({url:'http://accounts.google.com',name:'LSID',value:'mail|s.DE|s.youtube|ss:DQAAANQAAABaFRX1RUeh3ZW9S7Pp31XJWUoMCA1DvAVywb3oSRkowlNipnfjK_xc13klbNPO39nxj7kpxLYrnvbK2SwTlaN2z_7uF1E_qw0ePYfKUDog9l5YCE6PvrZVoSz5flmY_rKJulEQCB_mMS4u4MwOO8aWt82IAb5dMHofknapOdtbjWhzTJcpfZMmdngm3OYuur7qywtHuEWRc60yRu16XxhEI1SPF3skmwF47dGyeq9SS4wnirx58Ft9mSfhiVV1VV9EpQFC77e7-av4DCX-OAUyPvtY98rtAEL7ckf6V1c1cg',path:'/',domain:'accounts.google.com',httpOnly:true});
            }
        });
        
        // insert redirect script
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {action: "login"});
        });
    });
    $('button#startTestCase').click(function() {
        console.log('start test case');
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {action: "start", testCaseID: $($('input')[0]).val()});
        });
    });
})();