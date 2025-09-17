/**
 * @swagger
 * /api/v1/downloads/git/history:
 *  post:
 *    summary: gitlab 이력 다운로드
 *    description: gitlab 프로젝트, 기간별로 엑셀다운로드
 *    tags: [downloads]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              projectId:
 *                type: string
 *                example: "unidocu5-ubase"
 *              fromDate:
 *                type: string
 *                example: "2024-01-01"
 *              toDate:
 *                type: string
 *                example: "2024-01-31"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *            schema:
 *            type: string
 *            format: binary
 *        headers:
 *           Content-Disposition:
 *            schema:
 *             type: string
 *            description: 'attachment; filename="example.xlsx"'
 */
/**
 * @swagger
 *  /api/v1/downloads/licenses/unidocu:
 *   post:
 *    summary: unidocu
 *    description:
 *    tags: [downloads]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              licenseType:
 *                type: string
 *                example: "EVALUATION_CONST"
 *              hostName:
 *                type: string
 *                example: "localhost"
 *              expiredDate:
 *                type: string
 *                example: "2025-12-31"
 *              productName:
 *                type: string
 *                example: "unidocu5"
 *              applicant:
 *                type: string
 *                example: ""
 *              companyName:
 *                type: string
 *                example: "unipost"
 *              email:
 *                type: string
 *                example: "admin@maii.com"
 *              message:
 *                type: string
 *                example: ""
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/octet-stream:
 *            schema:
 *            type: string
 *            format: binary
 *        headers:
 *           Content-Disposition:
 *            schema:
 *             type: string
 *            description: 'attachment; filename="filename.lic"'
 */
/**
 * @swagger
 *  /api/v1/downloads/rdp:
 *   post:
 *    summary: rdp 다운로드
 *    description:
 *    deprecated: true
 *    tags: [downloads]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              address:
 *                type: string
 *                example: "192.168.12.196"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/x-rdp:
 *            schema:
 *            type: string
 *            format: binary
 *        headers:
 *           Content-Disposition:
 *            schema:
 *             type: string
 *            description: 'attachment; filename="address.rdp"'
 */
/**
 * @swagger
 * /api/v1/otp/google:
 *  post:
 *    summary:
 *    description:
 *    tags: [otp]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              customer:
 *                type: Array<string>
 *                example: ["unipost"]
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *            type: string
 *            format: binary
 */
/**
 * @swagger
 * /api/v1/licenses/unidocu/aes/encrypt:
 *  post:
 *    summary:
 *    description:
 *    tags: [licenses]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              plainText:
 *                type: string
 *                example: "unipost"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: string
 *                  example: "468A5ABA5A490A31E3D7B99F981C6238"
 */
/**
 * @swagger
 * /api/v1/licenses/unidocu/aes/decrypt:
 *  post:
 *    summary:
 *    description:
 *    tags: [licenses]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              cryptoText:
 *                type: string
 *                example: "468A5ABA5A490A31E3D7B99F981C6238"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: string
 *                  example: "유니포스트"
 */
/**
 * @swagger
 * /api/v1/licenses/unidocu/aes/decrypt:
 *  post:
 *    summary:
 *    description:
 *    tags: [licenses]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              cryptoText:
 *                type: string
 *                example: "468A5ABA5A490A31E3D7B99F981C6238"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: string
 *                  example: "유니포스트"
 */
/**
 * @swagger
 * /api/v1/hyperv/connect/list:
 *  get:
 *    summary:
 *    description:
 *    tags: [licenses]
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: array
 *                  example: ""
 */
/**
 * @swagger
 * /api/v1/hyperv/connect/update:
 *  get:
 *    summary:
 *    description:
 *    tags: [licenses]
 *    parameters:
 *    - name: customer
 *      in: query
 *      description:
 *      required: true
 *    - name: hostName
 *      in: query
 *      description:
 *      required: true
 *    - name: isConnect
 *      in: query
 *      description:
 *      required: true
 *    - name: clientHostName
 *      in: query
 *      description:
 *      required: true
 *    - name: currentTime
 *      in: query
 *      description:
 *      required: true
 *    - name: type
 *      in: query
 *      description:
 *      required: true
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                  example: true
 */
/**
 * @swagger
 * /api/v1/customerList:
 *  post:
 *    summary:
 *    description:
 *    tags: [schema]
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              type:
 *                type: string
 *                example: "R"
 *    responses:
 *      200:
 *        description: 성공
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: object
 *                  example: ""
 */
//# sourceMappingURL=test.swagger.js.map
