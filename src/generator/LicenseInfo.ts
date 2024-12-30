class LicenseInfo {
    private licenseType: string = '';
    private hostName: string = '';
    private expiredDate: string = '';
    private productName: string = '';
    private applicant: string = '';
    private companyName: string = '';
    private email: string = '';
    private message: string = '';

    public getLicenseType(): string {
        return this.licenseType;
    }

    public getHostName(): string {
        return this.hostName;
    }

    public getExpiredDate(): string {
        return this.expiredDate;
    }

    public getProductName(): string {
        return this.productName;
    }

    public getApplicant(): string {
        return this.applicant;
    }

    public getCompanyName(): string {
        return this.companyName;
    }

    public getEmail(): string {
        return this.email;
    }

    public getMessage(): string {
        return this.message;
    }

    public setLicenseType(licenseType: string) {
        this.licenseType = licenseType;
    }
    public setHostName(hostName: string) {
        this.hostName = hostName;
    }

    public setExpiredDate(expiredDate: string) {
        this.expiredDate = expiredDate;
    }

    public setProductName(productName: string) {
        this.productName = productName;
    }

    public setApplicant(applicant: string) {
        this.applicant = applicant;
    }

    public setCompanyName(companyName: string) {
        this.companyName = companyName;
    }

    public setEmail(email: string) {
        this.email = email;
    }

    public setMessage(message: string) {
        this.message = message;
    }
}

export default LicenseInfo;
