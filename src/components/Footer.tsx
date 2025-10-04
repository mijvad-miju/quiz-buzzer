import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-4 border-t border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center">
          <p className="text-sm text-muted-foreground">
            Provided by{' '}
            <span className="font-semibold text-foreground">Elevates</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
