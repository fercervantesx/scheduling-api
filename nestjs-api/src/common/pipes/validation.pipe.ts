import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    
    console.log('Validating input:', JSON.stringify(value));
    
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    
    if (errors.length > 0) {
      const messages = errors.map(err => {
        return {
          property: err.property,
          constraints: err.constraints,
          value: err.value
        };
      });
      
      console.error('Validation errors:', JSON.stringify(messages));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages
      });
    }
    
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}