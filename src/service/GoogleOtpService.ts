import {authenticator} from 'otplib';

class GoogleOtpService {
    private otpListData = [
        {
            customer: 'PI첨단소재',
            otp: [
                {
                    secret: 'DLYATX7ORBQJ45HG',
                    mobile: '3',
                    user: 'web',
                    team: '2'
                }
            ]
        },
        {
            customer: '광동',
            otp: [
                {
                    secret: 'IDRIPE4KVJKYSXUE',
                    mobile: '5',
                    user: 'smoh'
                },
                {
                    secret: 'ZTXSNHNBEJJV6PWL',
                    mobile: '5',
                    user: 'soccer6504'
                },
                {
                    secret: 'GXINK4F5JBVP7TRC',
                    mobile: '5',
                    user: 'UNI01'
                },
                {
                    secret: 'TX24DE6KCV53UHZI',
                    mobile: '5',
                    user: 'UNI02'
                }
            ]
        },
        {
            customer: 'FNU',
            otp: [
                {
                    secret: 'LBJEOTCKGY3EOUKPINCVCUSTIU',
                    mobile: '3',
                    user: '200624_1'
                }
            ]
        },
        {
            customer: 'SK스토아',
            otp: [
                {
                    secret: 'AWCT76FED6PBJUJJ',
                    mobile: '3',
                    user: 'SAP1002'
                },
                {
                    secret: 'AWQUTJ6NT3KEMRQ4',
                    mobile: '3',
                    user: 'SAP1003'
                },
                {
                    secret: 'OV3MHCXDU35AOWCT',
                    mobile: '3',
                    user: 'SAP1004'
                }
            ]
        },
        {
            customer: '11번가',
            otp: [
                {
                    secret: '47NQJAWXLWSZ2CWI',
                    mobile: '3',
                    user: 'PP00449'
                },
                {
                    secret: '6RIXSL64SMNLTM25',
                    mobile: '2',
                    user: 'PP23171'
                }
            ]
        },
        {
            customer: '한화케미칼',
            otp: [
                {
                    secret: '6B4ZATPBWVBLFRMA',
                    mobile: '3',
                    user: 'jaehyun.k'
                }
            ]
        },
        {
            customer: '오뚜기',
            otp: [
                {
                    secret: 'PEZU2NDBGI2DMVTR',
                    mobile: '3',
                    user: 'sap10'
                }
            ]
        },
        {
            customer: '경동',
            otp: [
                {
                    secret: '5KXAXDG5JZNECFL4CPQY6VOBDJ7EZWBAQUY3ZHKUPPIHQV7YVG22KS2234CYENPU',
                    mobile: '3',
                    user: 'Amazon_Web_Services'
                }
            ]
        },
        {
            customer: '네트웍스',
            otp: [
                {
                    secret: 'K5JUETKGIJHUSSZXJ5GFGVKKGU',
                    mobile: '3',
                    user: 'SKNETWORKS-91112216'
                }
            ]
        },
        {
            customer: '보령',
            otp: [
                {
                    secret: 'SOXBEJ5OMGVZEDQS',
                    mobile: '3',
                    user: 'unipost1'
                },
                {
                    secret: 'GPGQJU5X6OFD4UP5',
                    mobile: '3',
                    user: 'unipost2'
                }
            ]
        },
        {
            customer: '엘오티베큠',
            otp: [
                {
                    secret: 'HFAHASR6SJMYTF3ZVVTOZSLXVOGR6FZK',
                    mobile: '3',
                    user: 'unipost6'
                },
                {
                    secret: 'FXDOLE4QJ4BYI6C2I7G4SHMVWW7ARLII',
                    mobile: '3',
                    user: 'unipost7'
                },
                {
                    secret: 'OPOLQE6YEUEGASTZVL56KS6MG6RLDTPG',
                    mobile: '3',
                    user: 'unipost8'
                },
                {
                    secret: 'OL4K343DACKTMWNUORCOR4OUL2DZOBK3',
                    mobile: '3',
                    user: 'unipost9'
                }
            ]
        },
        {
            customer: '에센코어',
            otp: [
                {
                    secret: 'GRIDMMRTJNIE2WSFGRJEUWJVLE',
                    mobile: '3',
                    user: 'ESNSVPN01'
                }
            ]
        },
        {
            customer: '무신사',
            otp: [
                {
                    secret: 'KRLE4VCEKVHDKQKLIFNEGUSYKM',
                    mobile: '3',
                    user: 'mssvpn.corp.musinsa'
                }
            ]
        },
        {
            customer: '캐논',
            otp: [
                {
                    secret: 'LJLTMMSOJBDTORJXGMZTGQSOJQ',
                    mobile: '2',
                    user: 'DEV006'
                },
                {
                    secret: 'GJFVASSWLBFUUTJTGJMVIRJUGM',
                    mobile: '5',
                    user: 'dev005'
                }
            ]
        },
        {
            customer: '아모레퍼시픽',
            otp: [
                {
                    secret: 'JNLTKU2ZKBEU2SZSIRDTMNCHLJCUGQKE',
                    mobile: '2',
                    user: 'AC931418@stg-pam.amorepacific.com'
                },
                {
                    secret: '52OKVQO6JBTUEAEZ',
                    mobile: '2',
                    user: 'AC913715'
                },
                {
                    secret: 'K5MFCQSTIFBFCSCXGU2VOU2YKYZU4MZS',
                    mobile: '2',
                    user: 'AC931418@prd-pem.amorepacific.com'
                },
                {
                    secret: 'IFBTSMJTG4YTKQLNN5ZGKLKHN5XWO3DFFVHVIUA',
                    mobile: '2',
                    user: 'AC913715'
                },
                {
                    secret: '3LMZE2CDXZD7AZLB',
                    mobile: '2',
                    user: 'AC931418'
                }
            ]
        },
        {
            customer: '??',
            otp: [
                {
                    secret: '4L7UVDVYT3FFJSD6WAYZJ57XU7TNNFM6',
                    mobile: '?',
                    user: '헬로베어'
                }
            ]
        },
        {
            customer: '42dot.okta.com',
            otp: [
                {
                    secret: 'SF4ZGWWQ4YPX2FL4',
                    mobile: '3',
                    user: 'younghoon.jang@42dot.io'
                }
            ]
        },
        {
            customer: 'SK스퀘어',
            otp: [
                {
                    secret: 'KP6BKPUTKMTR5MX3',
                    mobile: '5',
                    user: 'Q00440'
                },
                {
                    secret: 'SGSSEZ4QKWSXWPPY',
                    mobile: '5',
                    user: 'Q00439'
                }
            ]
        },
        {
            customer: '티맵',
            otp: [
                {
                    secret: 'CS6LQ3ZLPDM5INBJ',
                    mobile: '5',
                    user: 'server_tmap'
                }
            ]
        },
        {
            customer: '롯데알미늄',
            otp: [
                {
                    secret: 'LFGTINCGIM2VMWKYJFLVSQSVKQ',
                    mobile: '5',
                    user: 'LANIS-DOM-splpjt_13'
                },
                {
                    secret: 'KVDVONCZJJKUMVCVKNDFSWSPK4',
                    mobile: '5',
                    user: 'LANIS-DOM-splpjt_14'
                },
                {
                    secret: 'LIZTIRCELJLE6VCHKJHVCUKVKQ',
                    mobile: '5',
                    user: 'LANIS-DOM-splpjt_15'
                }
            ]
        },
        {
            customer: '유베이스',
            otp: [
                {
                    secret: '2D3QQWWA5QQTFRFI',
                    mobile: '3',
                    user: 'uni005-SecuwaySSL'
                }
            ]
        },
        {
            customer: '구독웹',
            otp: [
                {
                    secret: '3KXKOCLVR3WI5SA65NWP6P5NLMYEIMOC',
                    mobile: 'none',
                    user: 'unipost.web@gmail.com'
                }
            ]
        }
    ];

    public getList(option: string, customer: any) {
        if (option === 'a') {
            return {tableData: this.otpListData};
        } else {
            const filterOtps: any = this.otpListData.find((optItem) => optItem['customer'] === customer);
            const otps = filterOtps.otp.map(({secret, user, mobile}: any) => {
                return {user, mobile, otp: authenticator.generate(secret)};
            });
            console.log(otps);
            console.log(authenticator.timeUsed());
            return {tableData: otps, timeUse: authenticator.timeUsed()};
        }
    }
}

export default new GoogleOtpService();
